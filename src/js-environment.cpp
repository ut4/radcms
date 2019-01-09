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
    // global.insnEnv
    duk_push_bare_object(ctx);                         // [insnEnv]
    duk_push_string(ctx, appContext->sitePath.c_str());// [insnEnv string]
    duk_put_prop_string(ctx, -2, "sitePath");          // [insnEnv]
    duk_push_string(ctx, appContext->appPath.c_str()); // [insnEnv string]
    duk_put_prop_string(ctx, -2, "appPath");           // [insnEnv]
    duk_put_global_string(ctx, "insnEnv");             // []
}

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

static duk_ret_t
myModSearchFn(duk_context *ctx) {
    constexpr int REQUIRE_IS_AT = 1;
    const auto id = std::string(duk_get_string(ctx, 0));
    /*
     * Read the file
     */
    std::string code;
    duk_push_global_stash(ctx);                    // [id req exp mod stash]
    auto *app = jsEnvironmentPullAppContext(ctx, -1);
    std::string filePath = app->appPath + "js/" + id;
    if (!myFsRead(filePath, code, app->errBuf)) {
        return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                         ("Module '" + filePath + "' not found.").c_str());
    }
    /*
     * Fill in the @native methods ...
     */
    if (id == JS_FILE_COMMON_SERVICES) {
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
