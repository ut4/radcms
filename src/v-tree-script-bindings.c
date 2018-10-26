#include "../include/v-tree-script-bindings.h"

#define V_TREE_STASH_KEY "_VTree"

/** Puts $vTree to the duktape thread/ctx stash */
static void
vTreeSBSetStashedVTree(duk_context *ctx, VTree *vTree);

/** Implements global.vTree.registerElement($tagName, $props, $children) */
static duk_ret_t
vTreeSBRegisterElement(duk_context *ctx);

void
vTreeScriptBindingsRegister(duk_context *ctx) {
    duk_push_bare_object(ctx);                       // [... object]
    duk_push_c_lightfunc(ctx, vTreeSBRegisterElement, 3, 3, 0); // [... object lightfn]
                                                     // 3 == tagName, props, children
    duk_put_prop_string(ctx, -2, "registerElement"); // [... object]
    duk_put_global_string(ctx, "vTree");             // [...]
}

bool
vTreeScriptBindingsExecLayout(duk_context *ctx, char *layoutCode, VTree *vTree,
                              DocumentDataConfig *ddc, const char *url,
                              char *err) {
    vTreeInit(vTree);
    documentDataConfigInit(ddc);
    vTreeSBSetStashedVTree(ctx, vTree);
    dataQuerySBSetStashedDocumentDataConfig(ctx, ddc);
    duk_pcompile_string(ctx, DUK_COMPILE_FUNCTION, layoutCode);
    if (!duk_is_function(ctx, -1)) {
        putError(duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // error
        return false;
    }
    duk_get_global_string(ctx, "vTree");              // arg1
    duk_get_global_string(ctx, "documentDataConfig"); // arg2
    duk_push_string(ctx, url);                        // arg3
    if (duk_pcall(ctx, 3) != 0) {
        putError(duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // pcall result
        return false;
    }
    vTree->rootElemIndex = vTree->elemNodes.length - 1;
    duk_pop(ctx); // pcall result
    return true;
}

static void
pushComponent(duk_context *ctx, Component *data) {
    duk_push_object(ctx);                 // [... obj]
    duk_push_uint(ctx, data->id);         // [... obj uint]
    duk_put_prop_string(ctx, -2, "id");   // [... obj]
    duk_push_string(ctx, data->name);     // [... obj string]
    duk_put_prop_string(ctx, -2, "name"); // [... obj]
    duk_push_string(ctx, data->json);     // [... obj string]
    duk_json_decode(ctx, -1);             // [... obj obj]
    duk_put_prop_string(ctx, -2, "data"); // [... obj]
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
    unsigned nth = 0;
    for (unsigned i = 0; i < allComponents->length; ++i) {
        if (allComponents->values[i].dataBatchConfigId == dataBatchConfigId) {
            pushComponent(ctx, &allComponents->values[i]);
            duk_put_prop_index(ctx, arrIdx, nth);
            nth += 1;
        }
    }
    return nth > 0;
}

unsigned
vTreeScriptBindingsExecTemplate(duk_context *ctx, char *templateCode,
                                VTree *vTree, DataBatchConfig *dbc,
                                ComponentArray *allComponents, bool isRenderAll,
                                const char *url, char *err) {
    vTreeSBSetStashedVTree(ctx, vTree);
    duk_pcompile_string(ctx, DUK_COMPILE_FUNCTION, templateCode);
    if (!duk_is_function(ctx, -1)) {
        putError(duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // error
        return 0;
    }
    duk_get_global_string(ctx, "vTree"); // arg1
    const bool found = !isRenderAll       // arg2
        ? findAndPushSingleComponent(ctx, allComponents, dbc->id)
        : findAndPushComponentArray(ctx, allComponents, dbc->id);
    if (!found) { // abort rendering, put <pre>$messageToDev</pre> instead
        duk_pop_n(ctx, 2); // arg1, function
        char asStr[dataBatchConfigGetToStringLen(dbc)];
        dataBatchConfigToString(dbc, asStr);
        const char *messageTmpl = "'%s' didn't return any data from the database.";
        const size_t l = strlen(messageTmpl) - 2 + strlen(asStr) + 1;
        char messageToDev[l];
        snprintf(messageToDev, l, messageTmpl, asStr);
        unsigned textRef = vTreeCreateTextNode(vTree, messageToDev);
        NodeRefArray children;
        nodeRefArrayInit(&children);
        nodeRefArrayPush(&children, textRef);
        return GET_NODEID(vTreeCreateElemNode(vTree, "pre", &children));
    }
    duk_push_string(ctx, url);           // arg3
    if (duk_pcall(ctx, 3) != 0) {
        putError(duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // pcall result
        return 0;
    }
    duk_pop(ctx); // pcall result
    return vTree->elemNodes.values[vTree->elemNodes.length - 1].id;
}

static void
vTreeSBSetStashedVTree(duk_context *ctx, VTree *vTree) {
    duk_push_thread_stash(ctx, ctx);                // [... stash]
    duk_push_pointer(ctx, (void*)vTree);            // [... stash pointer]
    duk_put_prop_string(ctx, -2, V_TREE_STASH_KEY); // [... stash]
    duk_pop(ctx);                                   // [...]
}

static duk_ret_t
vTreeSBRegisterElement(duk_context *ctx) {
    // Note: duk_get_top() is always 3 (same as the 3rd arg of duk_push_c_lightfunc())
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, V_TREE_STASH_KEY);
    VTree *vTree = (VTree*)duk_to_pointer(ctx, -1);
    const char *tagName = duk_require_string(ctx, 0); // 1st argument (tag name)
    // ignore the 2nd argument (props)
    NodeRefArray children;
    nodeRefArrayInit(&children);
    #define registerAndPushDataBatchConfig(dbcObjIsAt) \
        duk_get_prop_string(ctx, dbcObjIsAt, "id"); \
        unsigned dbcId = duk_require_uint(ctx, -1); \
        nodeRefArrayPush(&children, vTreeUtilsMakeNodeRef(TYPE_DATA_BATCH_CONFIG, \
                                                          dbcId)); \
        duk_pop(ctx)
    // 3rd argument (children)
    /*
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
     * Array of elemNodes or&and dbc's (e(..., [e("child"...), ddc.renderOne(...)...])
     */
    } else if (duk_is_array(ctx, 2)) {
        unsigned l = (unsigned)duk_get_length(ctx, 2);
        if (l == 0) {
            nodeRefArrayFreeProps(&children);
            duk_error(ctx, DUK_ERR_TYPE_ERROR, "Child-array can't be empty.\n");
        }
        for (unsigned i = 0; i < l; ++i) {
            duk_get_prop_index(ctx, 2, i);
            duk_int_t a = duk_get_type(ctx, -1);
            if (a == DUK_TYPE_NUMBER) {
                nodeRefArrayPush(&children, (unsigned)duk_require_uint(ctx, -1));
            } else if (a == DUK_TYPE_OBJECT) {
                registerAndPushDataBatchConfig(-1);
            } else {
                nodeRefArrayFreeProps(&children);
                duk_error(ctx, DUK_ERR_TYPE_ERROR, "Child-array value must be a"
                          " <nodeRef> or <dataConfig>.\n");
            }
        }
        duk_pop_n(ctx, l); // each array value
    /*
     * Single dbc (e(..., ddc.renderOne(...))
     */
    } else if (duk_is_object(ctx, 2)) {
        registerAndPushDataBatchConfig(2);
    } else {
        nodeRefArrayFreeProps(&children);
        duk_error(ctx, DUK_ERR_TYPE_ERROR, "3rd arg must be \"str\", <nodeRef>"
            ", <dataConfig>, or [<nodeRef>|<dataConfig>...].\n");
    }
    unsigned newId = vTreeCreateElemNode(vTree, tagName, &children);
    duk_push_number(ctx, (double)newId);
    return 1;
}
