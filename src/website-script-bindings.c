#include "../include/website-script-bindings.h"

#define KEY_SITE_GRAPH_C_PTR "_siteGraphCPtr"
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

/** Implements website.getPages() */
static duk_ret_t
websiteSBGetPages(duk_context *ctx);

/** Implements website.getPageCount() */
static duk_ret_t
websiteSBGetPageCount(duk_context *ctx);

void
websiteScriptBindingsInit(duk_context *ctx, SiteGraph *siteGraph, char *err) {
    duk_push_global_stash(ctx);                           // [stash]
    // dukStash._websiteCPtr
    duk_push_pointer(ctx, siteGraph);                     // [stash ptr]
    duk_put_prop_string(ctx, -2, KEY_SITE_GRAPH_C_PTR);   // [stash]
    // dukStash.services.website
    commonScriptBindingsPushServices(ctx, -1);
    duk_push_bare_object(ctx);                            // [stash srvcs site]
    duk_push_c_lightfunc(ctx, websiteSBGetPages, 0, 0, 0);// [stash srvcs site lightfn]
    duk_put_prop_string(ctx, -2, "getPages");             // [stash srvcs site]
    duk_push_c_lightfunc(ctx, websiteSBGetPageCount, 0, 0, 0); // [stash srvcs site lightfn]
    duk_put_prop_string(ctx, -2, "getPageCount");         // [stash srvcs site]
    duk_put_prop_string(ctx, -2, "website");              // [stash srvcs]
    // dukStash._PageDataPrototypeProto
    duk_push_bare_object(ctx);                            // [stash srvcs proto]
    if (!dukUtilsCompileStrToFn(ctx, pageDataSBCallDirectiveFnStr, "pagedata.js", err)) return;
                                                          // [stash srvcs proto fn]
    duk_put_prop_string(ctx, -2, "callDirective");        // [stash srvcs proto]
    duk_put_prop_string(ctx, -3, KEY_PAGE_DATA_JS_PROTO); // [stash srvcs]
    duk_pop_n(ctx, 2);                                    // []
}

void
websiteScriptBindingsSetStashedPageData(duk_context *ctx) {
    duk_push_global_stash(ctx);                          // [stash]
    // out
    duk_push_bare_object(ctx);                           // [stash pageData]
    // out.allComponents = []
    duk_push_array(ctx);                                 // [stash pageData arr]
    duk_put_prop_string(ctx, -2, "allComponents");       // [stash pageData]
    // out.directiveInstances = []
    duk_push_array(ctx);                                 // [stash pageData arr]
    duk_put_prop_string(ctx, -2, "directiveInstances");  // [stash pageData]
    // out.directiveRegister = dukStash._directiveRegisterJsImpl
    commonScriptBindingsPushDirectiveRegister(ctx, -2);  // [stash pageData dirreg]
    duk_put_prop_string(ctx, -2, "directiveRegister");   // [stash pageData]
    // out.directiveInstanceCounter = 0
    duk_push_uint(ctx, 0);                               // [stash pageData number]
    duk_put_prop_string(ctx, -2, "directiveInstanceCounter"); // [stash pageData]
    // out.prototype = dukStash._PageDataPrototype
    duk_get_prop_string(ctx, -2, KEY_PAGE_DATA_JS_PROTO);// [stash pageData proto]
    duk_set_prototype(ctx, -2);                          // [stash pageData]
    // dukStash._pageData = out
    duk_put_prop_string(ctx, -2, KEY_PAGE_DATA_JS_IMPL); // [stash]
    // push return value
    duk_get_prop_string(ctx, -1, KEY_PAGE_DATA_JS_IMPL); // [stash pageData]
    duk_remove(ctx, -2);                                 // [pageData]
}

const char*
websiteScriptBindingsStrinfigyStashedPageData(duk_context *ctx,
                                              int dukStashIsAt, char *err) {
                                                // [?]
    duk_get_prop_string(ctx, dukStashIsAt, KEY_PAGE_DATA_JS_IMPL); // [? obj]
    const char *out = duk_json_encode(ctx, -1); // [? str]
    duk_pop(ctx);                               // [?]
    return out;
}

static duk_ret_t
websiteSBGetPages(duk_context *ctx) {
    duk_push_global_stash(ctx);                         // [stash]
    duk_get_prop_string(ctx, -1, KEY_SITE_GRAPH_C_PTR); // [stash ptr]
    duk_push_array(ctx);                                // [stash ptr out]
    HashMapElPtr *ptr = ((SiteGraph*)duk_get_pointer(ctx, -2))->pages.orderedAccess;
    unsigned i = 0;
    while (ptr) {
        Page *p = ptr->data;
        duk_push_bare_object(ctx);                      // [... out page]
        duk_push_string(ctx, p->url);                   // [... out page url]
        duk_put_prop_string(ctx, -2, "url");            // [... out page]
        duk_push_uint(ctx, p->parentId);                // [... out page parentId]
        duk_put_prop_string(ctx, -2, "parentId");       // [... out page]
        duk_put_prop_index(ctx, -2, i);                 // [... out]
        ptr = ptr->next;
        i += 1;
    }
                                                        // [stash ptr out]
    return 1;
}

static duk_ret_t
websiteSBGetPageCount(duk_context *ctx) {
    duk_push_global_stash(ctx);                         // [stash]
    duk_get_prop_string(ctx, -1, KEY_SITE_GRAPH_C_PTR); // [stash ptr]
    duk_push_uint(ctx, ((SiteGraph*)duk_get_pointer(ctx, -1))->pages.size);
                                                        // [stash ptr uint]
    return 1;
}