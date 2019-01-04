#include "../../include/js-environment.hpp"

static constexpr const char* JS_FILE_COMMON_SERVICES = "common-services.js";
static constexpr int EXPORTS_IS_AT = 2;
static constexpr int MODULE_IS_AT = 3;

/** Implements <global>.require() */
static duk_ret_t
myModSearchFn(duk_context *ctx);

/** A function that adds a bunch of @native methods to a module $moduleId at
 * stack[MODULE_IS_AT].
 */
static bool
fillInNativeMethods(duk_context *ctx, const std::string &moduleId);

void
jsEnvironmentConfigure(duk_context *ctx, AppContext *appContext) {
    // global.Duktape.modSearch
    duk_get_global_string(ctx, "Duktape");             // [duk]
    duk_push_c_function(ctx, myModSearchFn, 4);        // [duk fn]
    duk_put_prop_string(ctx, -2, "modSearch");         // [duk]
    duk_pop(ctx);                                      // []
    // dukStash._appCtxPtr = appContext
    duk_push_global_stash(ctx);                        // [stash]
    jsEnvironmentPutAppContext(ctx, appContext, -1);
    duk_pop(ctx);                                      // []
}

void
jsEnvironmentPushCommonService(duk_context *ctx, const char *serviceName) {
    duk_get_global_string(ctx, "Duktape");     // [duk]
    duk_get_prop_string(ctx, -1, "modLoaded"); // [duk mods]
    bool foundCommons = duk_get_prop_string(ctx, -1, JS_FILE_COMMON_SERVICES); // [duk mods mod]
    assert(foundCommons && "modLoaded['common-service.js'] was null");
    duk_get_prop_string(ctx, -1, "exports");   // [duk mods mod exp]
    duk_get_prop_string(ctx, -1, serviceName); // [duk mods mod exp out]
    duk_swap_top(ctx, -5);                     // [out mods srvcs exp duk]
    duk_pop_n(ctx, 4);                         // [out]
}

static duk_ret_t
myModSearchFn(duk_context *ctx) {
    constexpr int REQUIRE_IS_AT = 1;
    const char *id = duk_get_string(ctx, 0);
    /*
     * Read the file
     */
    std::string code;
    duk_push_global_stash(ctx);                    // [id req exp mod stash]
    auto *app = jsEnvironmentPullAppContext(ctx, -1);
    std::string filePath = app->appPath + "js/" + std::string(id);
    if (!myFsRead(filePath, code, app->errBuf)) {
        return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                         ("Module '" + filePath + "' not found.").c_str());
    }
    /*
     * Fill in the @native methods ...
     */
    if (strcmp(id, JS_FILE_COMMON_SERVICES) == 0) {
        code = "function(require,module){var exports=module.exports;" + code + "}";
        if (!dukUtilsCompileStrToFn(ctx, code.c_str(), filePath.c_str(),
                                    app->errBuf)) { // [id req exp mod stash ptr fn]
            return duk_error(ctx, DUK_ERR_TYPE_ERROR, app->errBuf.c_str());
        }
        duk_dup(ctx, REQUIRE_IS_AT);                // [id req exp mod stash ptr fn req]
        duk_dup(ctx, MODULE_IS_AT);                 // [id req exp mod stash ptr fn req mod]
        if (duk_pcall(ctx, 2) != DUK_EXEC_SUCCESS) {
            dukUtilsPutDetailedError(ctx, -1, filePath.c_str(), app->errBuf);
            return duk_error(ctx, DUK_ERR_TYPE_ERROR, app->errBuf.c_str());
        }
        fillInNativeMethods(ctx, id);
        duk_push_null(ctx);                         // [id req exp mod stash null]
    /*
     * ... or return the file contents as is (plain ES5 code).
     */
    } else {
        duk_push_string(ctx, code.c_str());
    }
    return 1;
}

static bool
fillInNativeMethods(duk_context *ctx, const std::string &moduleId) {
    if (moduleId == "common-services.js") {
        commonServicesJsModuleInit(ctx, EXPORTS_IS_AT);
    }
    return true;
}
