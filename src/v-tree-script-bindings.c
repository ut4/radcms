#include "../include/v-tree-script-bindings.h"

#define KEY_VTREE_C_PTR "_vTreeCPtr"

/** Implements global.vTree.registerElement($tagName, $props, $children) */
static duk_ret_t
vTreeSBRegisterElement(duk_context *ctx);

/** Implements global.vTree.partial($fileName, $data) */
static duk_ret_t
vTreeSBPartial(duk_context *ctx);

/** Private funcs */
static void setStashedTree(duk_context *ctx, VTree *vTree);
static bool execLayoutWrap(duk_context *ctx, DocumentDataConfig *ddc,
                           const char *url, const char *fileName, char *err);
static void pushComponent(duk_context *ctx, Component *data);
static bool findAndPushSingleComponent(duk_context *ctx, ComponentArray *allComponents,
                                       unsigned dataBatchConfigId);
static bool findAndPushComponentArray(duk_context *ctx, ComponentArray *allComponents,
                                      unsigned dataBatchConfigId);

void
vTreeScriptBindingsRegister(duk_context *ctx) {
    duk_push_bare_object(ctx);                          // [... object]
    duk_push_c_lightfunc(ctx, vTreeSBRegisterElement, DUK_VARARGS, 0, 0); // [... object lightfn]
    duk_put_prop_string(ctx, -2, "registerElement");    // [... object]
    duk_push_c_lightfunc(ctx, vTreeSBPartial, 2, 2, 0); // [... object lightfn]
                                                        // 2 == tmplFileName, data
    duk_put_prop_string(ctx, -2, "partial");            // [... object]
    duk_put_global_string(ctx, "vTree");                // [...]
}

bool
vTreeScriptBindingsCompileAndExecLayoutWrap(duk_context *ctx, const char *layoutCode,
                                            DocumentDataConfig *ddc, const char *url,
                                            char *fileName, char *err) {
    if (!dukUtilsCompileStrToFn(ctx, layoutCode, fileName, err)) return false;
    return execLayoutWrap(ctx, ddc, url, fileName, err);
}

bool
vTreeScriptBindingsExecLayoutWrapFromCache(duk_context *ctx, const char *layoutName,
                                           DocumentDataConfig *ddc, const char *url,
                                           char *err) {
    duk_get_prop_string(ctx, -1, layoutName);
    if (!duk_is_function(ctx, -1)) return false;
    return execLayoutWrap(ctx, ddc, url, layoutName, err);
}

bool
vTreeScriptBindingsExecLayoutTmpl(duk_context *ctx, VTree *vTree,
                                  DataBatchConfig *batches,
                                  ComponentArray *allComponents, char *fileName,
                                  char *err) {
    setStashedTree(ctx, vTree);
    duk_get_global_string(ctx, "vTree"); // Arg1
    dataDefScriptBindingsSetStashedPageData(ctx); // Arg2
    unsigned argCount = 2;
    DataBatchConfig *cur = batches;
    while (cur) {                        // Arg3 ... Arg<n>
        const bool found = !cur->isFetchAll
            ? findAndPushSingleComponent(ctx, allComponents, cur->id)
            : findAndPushComponentArray(ctx, allComponents, cur->id);
        if (!found) {
            char asStr[dataBatchConfigGetToStringLen(cur)];
            dataBatchConfigToString(cur, asStr);
            printToStdErr("Error: '%s' didn't return anything from the database.\n", asStr);
            duk_push_null(ctx);
        }
        cur = cur->next;
        argCount += 1;
    }
    if (duk_pcall(ctx, argCount) != 0) {
        dukUtilsPutDetailedError(ctx, -1, fileName, err);
        return false;
    }
    vTree->rootElemIndex = vTree->elemNodes.length - 1;
    duk_pop(ctx); // pcall result
    return true;
}

static ElemProp*
collectElemProps(duk_context *ctx) {// [str obj str] (arguments of vTree.registerElement()
    if (!duk_is_object_coercible(ctx, 1)) {
        return NULL;
    }
    duk_enum(ctx, 1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [str obj str enum]
    ElemProp *out = NULL;
    unsigned numPushed = 0;
    if (duk_next(ctx, 3, true)) {
        out = elemPropCreate(duk_require_string(ctx, -2),// [str obj str enum key val]
                             duk_require_string(ctx, -1));
        ElemProp *prev = out;
        numPushed += 2;
        while (duk_next(ctx, 3, true)) {
            prev->next = elemPropCreate(duk_require_string(ctx, -2),
                                        duk_require_string(ctx, -1));
            prev = prev->next;
            numPushed += 2;
        }
    }
    duk_pop_n(ctx, numPushed + 1);                  // [str obj str]
    return out;
}

static duk_ret_t
vTreeSBRegisterElement(duk_context *ctx) {
    if (duk_get_top(ctx) != 3) return duk_error(ctx, DUK_ERR_TYPE_ERROR,
        "registerElement expects exactly 3 arguments");
    const char *tagName = duk_require_string(ctx, 0); // 1st argument
    ElemProp *props = collectElemProps(ctx);          // 2nd argument (props)
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, KEY_VTREE_C_PTR);
    VTree *vTree = duk_to_pointer(ctx, -1);
    NodeRefArray children;
    nodeRefArrayInit(&children);
    /*                                                // 3rd argument (children)
     * Single elemNode (e(..., e("child" ...))
     */
    if (duk_is_number(ctx, 2)) {
        nodeRefArrayPush(&children, (unsigned)duk_to_uint(ctx, 2));
    /*
     * Single textNode (e(..., "Text here")
     */
    } else if (duk_is_string(ctx, 2)) {
        unsigned ref = vTreeCreateTextNode(vTree, duk_to_string(ctx, 2));
        nodeRefArrayPush(&children, ref);
    /*
     * Array of elemNodes
     */
    } else if (duk_is_array(ctx, 2)) {
        unsigned l = duk_get_length(ctx, 2);
        if (l == 0) {
            nodeRefArrayFreeProps(&children);
            return duk_error(ctx, DUK_ERR_TYPE_ERROR, "Child-array can't be empty.\n");
        }
        for (unsigned i = 0; i < l; ++i) {
            duk_get_prop_index(ctx, 2, i);
            duk_int_t a = duk_get_type(ctx, -1);
            if (a == DUK_TYPE_NUMBER) {
                nodeRefArrayPush(&children, (unsigned)duk_require_uint(ctx, -1));
            } else {
                nodeRefArrayFreeProps(&children);
                return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                                "Child-array value must be a <nodeRef>.\n");
            }
        }
        duk_pop_n(ctx, l); // each array value
    } else {
        nodeRefArrayFreeProps(&children);
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, "3rd arg must be \"str\", "
                        "<nodeRef>, or [<nodeRef>...].\n");
    }
    unsigned newId = vTreeCreateElemNode(vTree, tagName, props, &children);
    duk_push_uint(ctx, newId);
    return 1;
}

static duk_ret_t
vTreeSBPartial(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);           // [... str, data, stash]
    const char *tmplFileName = duk_require_string(ctx, 0);
    duk_get_prop_string(ctx, -1, tmplFileName);// [... str, data, stash, fn]
    if (!duk_is_function(ctx, -1)) {
        return duk_error(ctx, DUK_ERR_ERROR, "Failed to load cached fn.\n");
        return 0;
    }
    duk_get_global_string(ctx, "vTree"); // arg1, [... str, data, stash, fn, vTree]
    duk_dup(ctx, 1);                     // arg2, [... str, data, stash, fn, vTree, data]
    if (duk_pcall(ctx, 2) != 0) {        //       [... str, data, stash, err]
        return duk_error(ctx, DUK_ERR_ERROR, "(%s) %s", tmplFileName,
                         duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // error
        return 0;
    }                                    //       [... str, data, stash, number]
    duk_get_prop_string(ctx, -2, KEY_VTREE_C_PTR);
    VTree *vTree = duk_to_pointer(ctx, -1);
    duk_push_uint(ctx, vTreeUtilsMakeNodeRef(TYPE_ELEM,
        vTree->elemNodes.values[vTree->elemNodes.length - 1].id));
    return 1;
}

static void
setStashedTree(duk_context *ctx, VTree *vTree) {
    duk_push_thread_stash(ctx, ctx);                // [... stash]
    duk_push_pointer(ctx, vTree);                   // [... stash pointer]
    duk_put_prop_string(ctx, -2, KEY_VTREE_C_PTR);  // [... stash]
    duk_pop(ctx);                                   // [...]
}

static bool
execLayoutWrap(duk_context *ctx, DocumentDataConfig *ddc, const char *url,
               const char *fileName, char *err) {
    dataQuerySBSetStashedDocumentDataConfig(ctx, ddc);
    duk_get_global_string(ctx, "documentDataConfig"); // arg1
    duk_push_string(ctx, url);                        // arg2
    if (duk_pcall(ctx, 2) != 0) {
        dukUtilsPutDetailedError(ctx, -1, fileName, err);
        return false;
    }
    if (!duk_is_function(ctx, -1)) {
        putError("Layout (%s) should return a function.\n", fileName);
        return false;
    }
    // leave pcall result at the top
    //
    DataBatchConfig *cur = ddc->batchHead ? &ddc->batches : NULL;
    while (cur) {
        if (cur->errors) return false;
        cur = cur->next;
    }
    return true;
}

static void
pushComponent(duk_context *ctx, Component *data) {
    duk_push_string(ctx, data->json);     // [... string]
    duk_json_decode(ctx, -1);             // [... obj]
    duk_push_object(ctx);                 // [... obj obj]
    duk_push_uint(ctx, data->id);         // [... obj obj uint]
    duk_put_prop_string(ctx, -2, "id");   // [... obj obj]
    duk_push_string(ctx, data->name);     // [... obj obj string]
    duk_put_prop_string(ctx, -2, "name"); // [... obj obj]
    duk_put_prop_string(ctx, -2, "cmp");  // [... obj]
}

static bool
findAndPushSingleComponent(duk_context *ctx, ComponentArray *allComponents,
                           unsigned dataBatchConfigId) {
    for (unsigned i = 0; i < allComponents->length; ++i) {
        if (allComponents->values[i].dataBatchConfigId == dataBatchConfigId) {
            pushComponent(ctx, &allComponents->values[i]);
            return true;
        }
    }
    return false;
}

static bool
findAndPushComponentArray(duk_context *ctx, ComponentArray *allComponents,
                          unsigned dataBatchConfigId) {
    duk_idx_t arrIdx = duk_push_array(ctx);
    duk_uarridx_t nth = 0;
    for (unsigned i = 0; i < allComponents->length; ++i) {
        if (allComponents->values[i].dataBatchConfigId == dataBatchConfigId) {
            pushComponent(ctx, &allComponents->values[i]);
            duk_put_prop_index(ctx, arrIdx, nth);
            nth += 1;
        }
    }
    return nth > 0;
}
