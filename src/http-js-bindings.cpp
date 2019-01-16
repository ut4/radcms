#include "../../include/http-js-bindings.hpp"

constexpr const char* KEY_REQ_PTR = DUK_HIDDEN_SYMBOL("_MhdRequestPtr");

static duk_ret_t requestGetUrlParam(duk_context *ctx);

void
httpJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    duk_get_prop_string(ctx, exportsIsAt, "Request");       // [? Req]
    duk_get_prop_string(ctx, -1, "prototype");              // [? Req proto]
    duk_push_c_lightfunc(ctx, requestGetUrlParam, 1, 0, 0); // [? Req proto lightfn]
    duk_put_prop_string(ctx, -2, "getUrlParam");            // [? Req proto]
    duk_pop_2(ctx);
}

void
httpJsBindingsPushNewRequest(duk_context *ctx, struct MHD_Connection *conn,
                             const char *url, const char *method) {
    jsEnvironmentPushModuleProp(ctx, "http.js", "Request"); // [? Req]
    duk_push_string(ctx, url);                              // [? Req str]
    duk_push_string(ctx, method);                           // [? Req str str]
    duk_new(ctx, 2);                                        // [? req]
    duk_push_pointer(ctx, conn);                            // [? req ptr]
    duk_put_prop_string(ctx, -2, KEY_REQ_PTR);              // [? req]
}

static duk_ret_t
requestGetUrlParam(duk_context *ctx) {
    duk_push_this(ctx);                        // [str this]
    duk_get_prop_string(ctx, -1, KEY_REQ_PTR); // [str this ptr]
    auto *conn = static_cast<struct MHD_Connection*>(duk_get_pointer(ctx, -1));
    const char *val = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND,
                                                  duk_require_string(ctx, 0));
    if (val) {
        duk_push_string(ctx, val);
    } else {
        duk_push_null(ctx);
    }
    return 1;
}
