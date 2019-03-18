#include "../../include/js-environment.hpp"

static constexpr int EXPORTS_IS_AT = 2;
static constexpr int MODULE_IS_AT = 3;

/** Implements <global>.require() */
static duk_ret_t myModSearchFn(duk_context *ctx);
static duk_ret_t envSetProp(duk_context *ctx);

void
jsEnvironmentConfigure(duk_context *ctx, AppEnv *appEnv) {
    // global.Duktape.modSearch
    duk_get_global_string(ctx, "Duktape");             // [duk]
    duk_push_c_function(ctx, myModSearchFn, 4);        // [duk fn]
    duk_put_prop_string(ctx, -2, "modSearch");         // [duk]
    duk_pop(ctx);                                      // []
    // dukStash._appEnvPtr = appContext
    duk_push_global_stash(ctx);                        // [stash]
    jsEnvironmentPutAppEnv(ctx, appEnv, -1);
    duk_pop(ctx);                                      // []
    // global.insnEnv
    duk_push_bare_object(ctx);                         // [insnEnv]
    duk_push_string(ctx, appEnv->appPath.c_str());     // [insnEnv string]
    duk_put_prop_string(ctx, -2, "appPath");           // [insnEnv]
    duk_push_string(ctx, appEnv->dataPath.c_str());    // [insnEnv string]
    duk_put_prop_string(ctx, -2, "dataPath");          // [insnEnv]
    duk_push_string(ctx, appEnv->homePath.c_str());    // [insnEnv string]
    duk_put_prop_string(ctx, -2, "homePath");          // [insnEnv]
    duk_push_c_lightfunc(ctx, envSetProp, 2, 0, 0);    // [insnEnv lightfn]
    duk_put_prop_string(ctx, -2, "setProp");           // [insnEnv]
    duk_put_global_string(ctx, "insnEnv");             // []
}

static duk_ret_t
myModSearchFn(duk_context *ctx) {
    constexpr int REQUIRE_IS_AT = 1;
    const auto id = std::string(duk_get_string(ctx, 0));
    std::string code;
    duk_push_global_stash(ctx);                     // [id req exp mod stash]
    auto *app = jsEnvironmentPullAppEnv(ctx, -1);
    std::string filePath = app->appPath + "js/" + id;
    bool isCrypto = false;
    bool isXmlReader = false;
    /*
    * Read the file (if not native-only)
    */
    if (!(isCrypto = id == "crypto.js") &&
        !(isXmlReader = id == "xml-reader.js")) {
        if (!myFsRead(filePath, code, app->errBuf)) {
            return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                             ("Module '" + filePath + "' not found.").c_str());
        }
    }
    /*
     * Fill in the @native methods ...
     */
    bool isApp = false;
    bool isCommonServices = false;
    bool isHttp = false;
    bool isWebsite = false;
    if (isCrypto ||
        isXmlReader ||
        (isApp = id == "app.js") ||
        (isCommonServices = id == "common-services.js") ||
        (isHttp = id == "http.js") ||
        (isWebsite = id == "website.js")) {
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
        if (isApp) appJsModuleInit(ctx, EXPORTS_IS_AT);
        else if (isCommonServices) commonServicesJsModuleInit(ctx, EXPORTS_IS_AT);
        else if (isHttp) httpJsModuleInit(ctx, EXPORTS_IS_AT);
        else if (isWebsite) websiteJsModuleInit(ctx, EXPORTS_IS_AT);
        else if (isCrypto) cryptoJsModuleInit(ctx, EXPORTS_IS_AT);
        else if (isXmlReader) xmlReaderJsModuleInit(ctx, EXPORTS_IS_AT);
        duk_push_null(ctx);                         // [id req exp mod stash foundIt]
    /*
     * ... or return the file contents as is (plain ES5 code).
     */
    } else {
        duk_push_string(ctx, code.c_str());
    }
    return 1;
}

static duk_ret_t
envSetProp(duk_context *ctx) {
    const char *key = duk_require_string(ctx, 0);
    if (strcmp(key, "currentWebsiteDirPath") == 0) {
        duk_push_global_stash(ctx);
        jsEnvironmentPullAppEnv(ctx, -1)->currentWebsiteDirPath =
            duk_require_string(ctx, 1);
    } else {
        return duk_error(ctx, DUK_ERR_ERROR, "%s is not valid property name",
                         key);
    }
    return 0;
}
