#include "../../include/js-environment-stash.hpp"

static constexpr const char* JS_FILE_COMMON_SERVICES = "common-services.js";
static constexpr const char* KEY_APP_PTR = "_appContextPtr";

void
jsEnvironmentPushModuleProp(duk_context *ctx, const char *moduleId,
                            const char *propName) {
    duk_get_global_string(ctx, "Duktape");     // [duk]
    duk_get_prop_string(ctx, -1, "modLoaded"); // [duk mods]
    bool foundModule = duk_get_prop_string(ctx, -1, moduleId); // [duk mods mod]
    assert(foundModule && "no such module");
    duk_get_prop_string(ctx, -1, "exports");   // [duk mods mod exp]
    duk_get_prop_string(ctx, -1, propName);    // [duk mods mod exp out]
    duk_swap_top(ctx, -5);                     // [out mods srvcs exp duk]
    duk_pop_n(ctx, 4);                         // [out]
}

void
jsEnvironmentPushCommonService(duk_context *ctx, const char *serviceName) {
    jsEnvironmentPushModuleProp(ctx, JS_FILE_COMMON_SERVICES, serviceName);
}

void
jsEnvironmentPutAppEnv(duk_context *ctx, AppEnv* env, const int stashIsAt) {
    duk_push_pointer(ctx, env);
    duk_put_prop_string(ctx, stashIsAt - (stashIsAt < 0 ? 1 : 0), KEY_APP_PTR);
}

AppEnv*
jsEnvironmentPullAppEnv(duk_context *ctx, const int stashIsAt) {
    duk_get_prop_string(ctx, stashIsAt, KEY_APP_PTR);
    auto *out = static_cast<AppEnv*>(duk_get_pointer(ctx, -1));
    duk_pop(ctx);
    return out;
}
