#include "../include/data-def-script-bindings.h"

#define PAGE_DATA_PROTO_STASH_KEY "_PageDataPrototype"
#define PAGE_DATA_INSTANCE_STASH_KEY "_pageData"

const char *pageDataSBCallDirectiveFnStr = "function (name, vTree, cmps) {"
    "var fn = this.directiveFactories.get(name);"
    "if (!fn) throw new TypeError(\"No such directive as '\"+name+\"'\");"
    "var directiveInstance = Object.create(null);"
    "directiveInstance.id = ++this.counter;"
    "directiveInstance.type = name;"
    "directiveInstance.components = cmps;"
    "this.directiveInstances.push(directiveInstance);"
    "return fn(vTree, cmps);"
"}";

void
dataDefScriptBindingsRegister(duk_context *ctx, char *err) {
    duk_push_thread_stash(ctx, ctx);                             // [stash]
    duk_push_bare_object(ctx);                                   // [stash obj]
    // out.callDirective = <fn>
    if (!dukUtilsCompileStrToFn(ctx, pageDataSBCallDirectiveFnStr, "pagedata.js", err)) return;
    duk_put_prop_string(ctx, -2, "callDirective");
    // stash._PageDataPrototypeProto = out
    duk_put_prop_string(ctx, -2, PAGE_DATA_PROTO_STASH_KEY);     // [stash]
    duk_pop(ctx);                                                // []
}

void
dataDefScriptBindingsSetStashedPageData(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);                     // [stash]
    // out
    duk_push_bare_object(ctx);                           // [stash obj]
    // out.allComponents = []
    duk_push_array(ctx);                                 // [stash obj arr]
    duk_put_prop_string(ctx, -2, "allComponents");       // [stash obj]
    // out.directiveInstances = []
    duk_push_array(ctx);                                 // [stash obj arr]
    duk_put_prop_string(ctx, -2, "directiveInstances");  // [stash obj]
    // out.directiveFactories = stash._directiveFactories
    duk_get_prop_string(ctx, -2, "_directiveFactories"); // [stash obj obj]
    duk_put_prop_string(ctx, -2, "directiveFactories");  // [stash obj]
    // out.counter = 0
    duk_push_uint(ctx, 0);                               // [stash obj number]
    duk_put_prop_string(ctx, -2, "counter");             // [stash obj]
    // out.prototype = stash._PageDataPrototype
    duk_get_prop_string(ctx, -2, PAGE_DATA_PROTO_STASH_KEY); // [stash obj proto]
    duk_set_prototype(ctx, -2);                          // [stash obj]
    // stash._pageData = out
    duk_put_prop_string(ctx, -2, PAGE_DATA_INSTANCE_STASH_KEY); // [stash]
    // push return value
    duk_get_prop_string(ctx, -1, PAGE_DATA_INSTANCE_STASH_KEY); // [stash obj]
    duk_swap_top(ctx, -2);                               // [obj stack]
    duk_pop(ctx);                                        // [obj]
}

const char*
dataDefScriptBindingsStrinfigyStashedPageData(duk_context *ctx, char *err) {
                                                // [stash]
    duk_get_prop_string(ctx, -1, PAGE_DATA_INSTANCE_STASH_KEY); // [stash obj]
    const char *out = duk_json_encode(ctx, -1); // [stash str]
    duk_pop(ctx);                               // [stash obj]
    return out;                                 // [stash]
}
