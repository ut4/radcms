#include "../include/directive-script-bindings.h"

#define DIRECTIVE_FACS_STASH_KEY "_directiveFactories"

/** Implements directiveFactories.get(<directiveName>) */
static duk_ret_t
directiveSBGetDirectiveFactory(duk_context *ctx);

void
directiveScriptBindingsRegister(duk_context *ctx, char *err) {
    duk_push_thread_stash(ctx, ctx);                             // [stash]
    duk_push_bare_object(ctx);                                   // [stash obj]
    // out.entries = {}
    duk_push_bare_object(ctx);                                   // [stash obj obj]
    duk_put_prop_string(ctx, -2, "entries");                     // [stash obj]
    // out.get = <fn>
    duk_push_c_lightfunc(ctx, directiveSBGetDirectiveFactory, 1, 0, 0); // [stash obj lightfn]
    duk_put_prop_string(ctx, -2, "get");                         // [stash obj]
    // stash._directiveFactories = out
    duk_put_prop_string(ctx, -2, DIRECTIVE_FACS_STASH_KEY);      // [stash]
    duk_pop(ctx);                                                // []
}

void
directiveFactoriesPutCachedFn(duk_context *ctx, const char *directiveName,
                              const char *cachedFnKey) {
                                                            // [stash]
    duk_get_prop_string(ctx, -1, DIRECTIVE_FACS_STASH_KEY); // [stash regObj]
    duk_get_prop_string(ctx, -1, "entries");                // [stash regObj entriesObj]
    duk_get_prop_string(ctx, -3, cachedFnKey);              // [stash regObj entriesObj fn]
    ASSERT(duk_is_function(ctx, -1), "stash.cachedFuncs['%s'] == NULL", cachedFnKey);
    duk_put_prop_string(ctx, -2, directiveName);            // [stash regObj entriesObj]
    duk_pop_n(ctx, 2);                                      // [stash]
}

static duk_ret_t
directiveSBGetDirectiveFactory(duk_context *ctx) {
    duk_push_this(ctx);                      // [str, obj]
    duk_get_prop_string(ctx, -1, "entries"); // [str, obj, obj]
    duk_get_prop_string(ctx, -1, duk_require_string(ctx, 0)); // [str, obj, obj, func|undefined]
    return 1;
}
