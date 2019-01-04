#include "../../include/app-context.hpp"

constexpr const char* KEY_APP_PTR = "_appContextPtr";

void
jsEnvironmentPutAppContext(duk_context *ctx, AppContext* app, const int stashIsAt) {
    duk_push_pointer(ctx, app);
    duk_put_prop_string(ctx, stashIsAt - (stashIsAt < 0 ? 1 : 0), KEY_APP_PTR);
}

AppContext*
jsEnvironmentPullAppContext(duk_context *ctx, const int stashIsAt) {
    duk_get_prop_string(ctx, stashIsAt, KEY_APP_PTR);
    auto *out = static_cast<AppContext*>(duk_get_pointer(ctx, -1));
    duk_pop(ctx);
    return out;
}
