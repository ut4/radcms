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
                              DocumentDataConfig *ddc, char *err) {
    vTreeInit(vTree);
    vTreeSBSetStashedVTree(ctx, vTree);
    documentDataConfigInit(ddc);
    dataQuerySBSetStashedDocumentDataConfig(ctx, ddc);
    if (duk_peval_string(ctx, layoutCode) != 0) {
        putError(duk_safe_to_string(ctx, -1));
        duk_pop(ctx); // peval result
        return false;
    }
    duk_pop(ctx); // peval result
    return true;
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
    // 3rd argument (children)
    if (duk_is_number(ctx, 2)) {
        nodeRefArrayPush(&children, (unsigned)duk_to_uint(ctx, 2));
    } else if (duk_is_string(ctx, 2)) {
        unsigned ref = vTreeCreateTextNode(vTree, duk_to_string(ctx, 2));
        nodeRefArrayPush(&children, ref);
    } else if (duk_is_array(ctx, 2)) {
        unsigned l = (unsigned)duk_get_length(ctx, 2);
        if (l == 0) {
            nodeRefArrayDestruct(&children);
            duk_error(ctx, DUK_ERR_TYPE_ERROR, "Child-array can't be empty.\n");
        }
        for (unsigned i = 0; i < l; ++i) {
            duk_get_prop_index(ctx, 2, i);
            nodeRefArrayPush(&children, (unsigned)duk_require_uint(ctx, -1));
        }
        duk_pop_n(ctx, l); // each array value
    } else if (duk_is_object(ctx, 2)) {
        duk_get_prop_string(ctx, 2, "id");
        unsigned dbcId = duk_require_uint(ctx, -1);
        nodeRefArrayPush(&children, vTreeUtilsMakeNodeRef(TYPE_DATA_BATCH_CONFIG,
                                                          dbcId));
        duk_pop(ctx); // uint
    } else {
        nodeRefArrayDestruct(&children);
        duk_error(ctx, DUK_ERR_TYPE_ERROR, "3rd arg must be \"str\", <nodeRef>"
            ", [<nodeRef>..], <dataConfig> or [<dataConfig>...].\n");
    }
    unsigned newId = vTreeCreateElemNode(vTree, tagName, &children);
    duk_push_number(ctx, (double)newId);
    return 1;
}
