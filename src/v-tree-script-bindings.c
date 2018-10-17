#include "../include/v-tree-script-bindings.h"

#define V_TREE_STASH_KEY "_VTree"

static void
vTreeScriptBindingsPushVtree(duk_context *ctx, VTree *vTree);

static duk_ret_t
vTreeRegisterElement(duk_context *ctx);

void
vTreeScriptBindingsRegister(duk_context *ctx) {
    duk_push_object(ctx);                              // [... object]
    duk_push_c_lightfunc(ctx, vTreeRegisterElement, 3, 3, 0); // [... object lightfn]
                                                              // 3 == tagName, props, children
    duk_put_prop_string(ctx, -2, "registerElement");   // [... object]
    duk_put_global_string(ctx, "vTree");               // [...]
}

bool
vTreeScriptBindingsExecLayout(duk_context *ctx, char *layoutCode, VTree *vTree,
                              char *err) {
    vTreeInit(vTree);
    vTreeScriptBindingsPushVtree(ctx, vTree);
    if (duk_peval_string(ctx, layoutCode) != 0) {
        putError(duk_safe_to_string(ctx, -1));
        duk_pop(ctx);
        return false;
    }
    duk_pop(ctx);
    return true;
}

static void
vTreeScriptBindingsPushVtree(duk_context *ctx, VTree *vTree) {
    duk_push_heap_stash(ctx);                          // [... stash]
    duk_push_pointer(ctx, (void*)vTree);               // [... stash pointer]
    duk_put_prop_string(ctx, -2, V_TREE_STASH_KEY);    // [... stash]
    duk_pop(ctx);                                      // [...]
}

static duk_ret_t
vTreeRegisterElement(duk_context *ctx) {
    // Note: duk_get_top() is always 3 (same as the 3rd arg of duk_push_c_lightfunc())
    duk_push_heap_stash(ctx);
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
    } else {
        nodeRefArrayDestruct(&children);
        duk_error(ctx, DUK_ERR_TYPE_ERROR, "3rd arg must be a string, a number,"
                  " or an array of numbers.\n");
    }
    unsigned newId = vTreeCreateElemNode(vTree, tagName, &children);
    duk_push_number(ctx, (double)newId);
    return 1;
}
