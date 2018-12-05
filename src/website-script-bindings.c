#include "../include/website-script-bindings.h"

#define KEY_PAGE_DATA_JS_PROTO "_PageDataPrototype"
#define KEY_PAGE_DATA_JS_IMPL "_pageDataJsImpl"

const char *pageDataSBCallDirectiveFnStr = "function (name, vTree, cmps) {"
    "var fn = this.directiveRegister.get(name);"
    "if (!fn) throw new TypeError(\"Directive '\"+name+\"' not found.\");"
    "var directiveInstance = Object.create(null);"
    "directiveInstance.id = ++this.directiveInstanceCounter;"
    "directiveInstance.type = name;"
    "directiveInstance.components = cmps;"
    "this.directiveInstances.push(directiveInstance);"
    "return fn(vTree, cmps);"
"}";

void
websiteScriptBindingsInit(duk_context *ctx, char *err) {
    duk_push_thread_stash(ctx, ctx);                      // [stash]
    // threadStash._PageDataPrototypeProto
    duk_push_bare_object(ctx);                            // [stash proto]
    if (!dukUtilsCompileStrToFn(ctx, pageDataSBCallDirectiveFnStr, "pagedata.js", err)) return;
    duk_put_prop_string(ctx, -2, "callDirective");
    duk_put_prop_string(ctx, -2, KEY_PAGE_DATA_JS_PROTO); // [stash]
    duk_pop(ctx);                                         // []
}

void
websiteScriptBindingsSetStashedPageData(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);                     // [stash]
    // out
    duk_push_bare_object(ctx);                           // [stash pageData]
    // out.allComponents = []
    duk_push_array(ctx);                                 // [stash pageData arr]
    duk_put_prop_string(ctx, -2, "allComponents");       // [stash pageData]
    // out.directiveInstances = []
    duk_push_array(ctx);                                 // [stash pageData arr]
    duk_put_prop_string(ctx, -2, "directiveInstances");  // [stash pageData]
    // out.directiveRegister = threadStash._directiveRegisterJsImpl
    commonScriptBindingsPushDirectiveRegister(ctx, -2);  // [stash pageData dirreg]
    duk_put_prop_string(ctx, -2, "directiveRegister");  // [stash pageData]
    // out.directiveInstanceCounter = 0
    duk_push_uint(ctx, 0);                               // [stash pageData number]
    duk_put_prop_string(ctx, -2, "directiveInstanceCounter"); // [stash pageData]
    // out.prototype = threadStash._PageDataPrototype
    duk_get_prop_string(ctx, -2, KEY_PAGE_DATA_JS_PROTO); // [stash pageData proto]
    duk_set_prototype(ctx, -2);                          // [stash pageData]
    // threadStash._pageData = out
    duk_put_prop_string(ctx, -2, KEY_PAGE_DATA_JS_IMPL); // [stash]
    // push return value
    duk_get_prop_string(ctx, -1, KEY_PAGE_DATA_JS_IMPL); // [stash pageData]
    duk_remove(ctx, -2);                                 // [pageData]
}

const char*
websiteScriptBindingsStrinfigyStashedPageData(duk_context *ctx,
                                              int threadStashIsAt, char *err) {
                                                // [?]
    duk_get_prop_string(ctx, threadStashIsAt, KEY_PAGE_DATA_JS_IMPL); // [? obj]
    const char *out = duk_json_encode(ctx, -1); // [? str]
    duk_pop(ctx);                               // [?]
    return out;
}
