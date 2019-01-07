#include "../include/v-tree-script-bindings.h"

#define KEY_VTREE_C_PTR "_vTreeCPtr"

/** Implements global.vTree.createElement($tagName, $props, $children) */
static duk_ret_t
vTreeSBCreateElement(duk_context *ctx);

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
vTreeScriptBindingsInit(duk_context *ctx) {
    duk_push_bare_object(ctx);                          // [object]
    duk_push_c_lightfunc(ctx, vTreeSBCreateElement, DUK_VARARGS, 0, 0); // [object lightfn]
    duk_put_prop_string(ctx, -2, "createElement");      // [object]
    duk_push_c_lightfunc(ctx, vTreeSBPartial, 2, 2, 0); // [object lightfn]
                                                        // 2 == tmplFileName, data
    duk_put_prop_string(ctx, -2, "partial");            // [object]
    duk_put_global_string(ctx, "vTree");                // []
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
    duk_get_global_string(ctx, "vTree");          // Arg1
    websiteScriptBindingsSetStashedPageData(ctx); // Arg2
    unsigned argCount = 2;
    DataBatchConfig *cur = batches;
    while (cur) {                                 // Arg3 ... Arg<n>
        const bool found = !cur->isFetchAll
            ? findAndPushSingleComponent(ctx, allComponents, cur->id)
            : findAndPushComponentArray(ctx, allComponents, cur->id);
        if (!found) {
            char asStr[dataBatchConfigGetToStringLen(cur)];
            dataBatchConfigToString(cur, asStr);
            printToStdErr("[Error]: '%s' didn't return anything from the database.\n", asStr);
        }
        cur = cur->next;
        argCount += 1;
    }
    if (duk_pcall(ctx, argCount) != DUK_EXEC_SUCCESS) {
        dukUtilsPutDetailedError(ctx, -1, fileName, err);
        return false;
    }
    vTree->rootElemIndex = vTree->elemNodes.length - 1;
    duk_pop(ctx); // pcall result
    return true;
}

static ElemProp*
collectElemProps(duk_context *ctx) {// [str obj str] (arguments of vTree.createElement()

}



static duk_ret_t
vTreeSBCreateElement(duk_context *ctx) {

}

static duk_ret_t
vTreeSBPartial(duk_context *ctx) {
    duk_push_global_stash(ctx);                  // [str data stash]
    const char *tmplFileName = duk_require_string(ctx, 0);
    duk_get_prop_string(ctx, -1, tmplFileName);  // [str data stash fn]
    if (!duk_is_function(ctx, -1)) {
        return duk_error(ctx, DUK_ERR_ERROR, "Failed to load cached fn.\n");
        return 0;
    }
    duk_get_global_string(ctx, "vTree"); // arg1, [str data stash fn vTree]
    duk_dup(ctx, 1);                     // arg2, [str data stash fn vTree, data]
    if (duk_pcall(ctx, 2) != DUK_EXEC_SUCCESS) { // [str data stash err]
        return duk_error(ctx, DUK_ERR_ERROR, "(%s) %s", tmplFileName,
                         duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // error
        return 0;
    }                                            // [str data stash number]
    duk_get_prop_string(ctx, -2, KEY_VTREE_C_PTR);
    VTree *vTree = duk_get_pointer(ctx, -1);
    duk_push_uint(ctx, vTreeUtilsMakeNodeRef(TYPE_ELEM,
        vTree->elemNodes.values[vTree->elemNodes.length - 1].id));
    return 1;
}

static void
setStashedTree(duk_context *ctx, VTree *vTree) {
    duk_push_global_stash(ctx);                     // [stash]
    duk_push_pointer(ctx, vTree);                   // [stash pointer]
    duk_put_prop_string(ctx, -2, KEY_VTREE_C_PTR);  // [stash]
    duk_pop(ctx);                                   // []
}

static bool
execLayoutWrap(duk_context *ctx, DocumentDataConfig *ddc, const char *url,
               const char *fileName, char *err) {
    dataQuerySBSetStashedDocumentDataConfig(ctx, ddc);
    duk_get_global_string(ctx, "documentDataConfig"); // arg1
    duk_push_string(ctx, url);                        // arg2
    if (duk_pcall(ctx, 2) != DUK_EXEC_SUCCESS) {
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
    duk_push_string(ctx, data->json);     // [string]
    duk_json_decode(ctx, -1);             // [obj]
    duk_push_object(ctx);                 // [obj obj]
    duk_push_uint(ctx, data->id);         // [obj obj uint]
    duk_put_prop_string(ctx, -2, "id");   // [obj obj]
    duk_push_string(ctx, data->name);     // [obj obj string]
    duk_put_prop_string(ctx, -2, "name"); // [obj obj]
    duk_put_prop_string(ctx, -2, "cmp");  // [obj]
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
    duk_push_bare_object(ctx);
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
