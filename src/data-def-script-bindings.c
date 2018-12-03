#include "../include/data-def-script-bindings.h"

#define KEY_PAGE_DATA_JS_PROTO "_PageDataPrototype"
#define KEY_PAGE_DATA_JS_IMPL "_pageDataJsImpl"

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
    duk_push_thread_stash(ctx, ctx);                      // [stash]
    duk_push_bare_object(ctx);                            // [stash obj]
    // out.callDirective = <fn>
    if (!dukUtilsCompileStrToFn(ctx, pageDataSBCallDirectiveFnStr, "pagedata.js", err)) return;
    duk_put_prop_string(ctx, -2, "callDirective");
    // threadStash._PageDataPrototypeProto = out
    duk_put_prop_string(ctx, -2, KEY_PAGE_DATA_JS_PROTO); // [stash]
    duk_pop(ctx);                                         // []
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
    // out.directiveFactories = threadStash._directiveFactories
    directiveScriptBindingsPushFactories(ctx, -2);       // [stash obj obj]
    duk_put_prop_string(ctx, -2, "directiveFactories");  // [stash obj]
    // out.counter = 0
    duk_push_uint(ctx, 0);                               // [stash obj number]
    duk_put_prop_string(ctx, -2, "counter");             // [stash obj]
    // out.prototype = threadStash._PageDataPrototype
    duk_get_prop_string(ctx, -2, KEY_PAGE_DATA_JS_PROTO); // [stash obj proto]
    duk_set_prototype(ctx, -2);                          // [stash obj]
    // threadStash._pageData = out
    duk_put_prop_string(ctx, -2, KEY_PAGE_DATA_JS_IMPL); // [stash]
    // push return value
    duk_get_prop_string(ctx, -1, KEY_PAGE_DATA_JS_IMPL); // [stash obj]
    duk_remove(ctx, -2);                                 // [obj]
}

const char*
dataDefScriptBindingsStrinfigyStashedPageData(duk_context *ctx, char *err) {
                                                // [stash]
    duk_get_prop_string(ctx, -1, KEY_PAGE_DATA_JS_IMPL); // [stash obj]
    const char *out = duk_json_encode(ctx, -1); // [stash str]
    duk_pop(ctx);                               // [stash obj]
    return out;                                 // [stash]
}
