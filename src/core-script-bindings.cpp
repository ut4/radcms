#include "../include/core-script-bindings.hpp"

static const char* KEY_SELF_C_PTR = "_coreScriptBindingsCtxCPtr";
static const char* KEY_SERVICES_JS_IMPL = "_servicesJsImpl";

// Stuff used by the scripts
struct CommonScriptBindingsCtx {
    Db *db;
    char *appPath;
    std::string *errBuf;
};

/** Duktape.modSearch(<id>, <require>, <exports>, <module>) */
static duk_ret_t
coreSBSearchModule(duk_context *ctx);

/** app.addRoute(<fn>) */
static duk_ret_t
appSBAddRoute(duk_context *ctx);

void
coreScriptBindingsInit(duk_context *ctx, Db *db, char *appPath,
                       std::string &err) {
    // global.Duktape.modSearch
    duk_get_global_string(ctx, "Duktape");             // [obj]
    duk_push_c_function(ctx, coreSBSearchModule, 4);   // [obj fn]
    duk_put_prop_string(ctx, -2, "modSearch");         // [obj]
    duk_pop(ctx);                                      // []
    // global.Request
    static const char *globalCode = "function Response(statusCode, body, headers) {"
        "if (statusCode < 100) throw new TypeError('Not valid status code: ', statusCode);"
        "this.statusCode = statusCode;"
        "this.body = body || '';"
        "if (headers) {"
            "for (var key in headers) {"
                "if (typeof headers[key] != 'string')"
                    "throw new TypeError('A header value must be a string.');"
            "}"
            "this.headers = headers;"
        "} else this.headers = {};"
    "}";
    if (!dukUtilsCompileAndRunStrGlobal(ctx, globalCode, "insane-core.js", err)) return;
    duk_push_global_stash(ctx);                        // [stash]
    // dukStash._dbCPtr && dukStask._errCPtr
    CommonScriptBindingsCtx *caccess = nullptr;
    if (db || appPath) {
        caccess = new CommonScriptBindingsCtx;
        caccess->db = db;
        caccess->appPath = appPath;
        caccess->errBuf = &err;
    }
    duk_push_pointer(ctx, caccess);                    // [stash ptr]
    duk_put_prop_string(ctx, -2, KEY_SELF_C_PTR);      // [stash]
    // services.db
    duk_push_bare_object(ctx);                         // [stash srvcs]
    duk_push_bare_object(ctx);                         // [stash srvcs db]
    duk_put_prop_string(ctx, -2, "db");                // [stash srvcs]
    // services.app
    duk_push_bare_object(ctx);                         // [stash srvcs app]
    duk_push_c_lightfunc(ctx, appSBAddRoute, 1, 0, 0); // [stash srvcs app lightfn]
    duk_put_prop_string(ctx, -2, "addRoute");          // [stash srvcs app]
    duk_push_array(ctx);                               // [stash srvcs app routes]
    duk_put_prop_string(ctx, -2, "_routes");           // [stash srvcs app]
    duk_put_prop_string(ctx, -2, "app");               // [stash srvcs]
    // dukStash.services
    duk_put_prop_string(ctx, -2, KEY_SERVICES_JS_IMPL);// [stash]
    duk_pop(ctx);                                      // []
}

void
coreScriptBindingsClean(duk_context *ctx) {
    duk_push_global_stash(ctx);                   // [stash]
    duk_get_prop_string(ctx, -1, KEY_SELF_C_PTR); // [stash ptr]
    free(duk_get_pointer(ctx, -1));
    duk_pop_n(ctx, 2);                            // []
}

void
coreScriptBindingsPushServices(duk_context *ctx, int dukStashIsAt) {
    duk_get_prop_string(ctx, dukStashIsAt, KEY_SERVICES_JS_IMPL);
}

void
coreScriptBindingsPushDb(duk_context *ctx, int dukStashIsAt) {
    coreScriptBindingsPushServices(ctx, dukStashIsAt); // [? srvcs]
    duk_get_prop_string(ctx, -1, "db");                // [? srvcs db]
    duk_remove(ctx, -2);                               // [? db]
}

void
coreScriptBindingsPushApp(duk_context *ctx, int dukStashIsAt) {
    coreScriptBindingsPushServices(ctx, dukStashIsAt); // [? srvcs]
    duk_get_prop_string(ctx, -1, "app");               // [? srvcs app]
    duk_remove(ctx, -2);                               // [? app]
}

static duk_ret_t
coreSBSearchModule(duk_context *ctx) {
    const char *id = duk_get_string(ctx, 0);
    duk_push_global_stash(ctx);             // [id req exp mod stash]
    if (strcmp(id, "services") == 0) {
        duk_get_prop_string(ctx, -1, KEY_SERVICES_JS_IMPL);
    } else {
        duk_pop(ctx);                       // [id req exp mod]
        return duk_error(ctx, DUK_ERR_ERROR, "Module '%s' not found", id);
    }
                                            // [id req exp mod stash out]
    duk_put_prop_string(ctx, 3, "exports"); // [id req exp mod stash]
    duk_push_null(ctx);                     // [id req exp mod stash null]
    duk_replace(ctx, -2);                   // [id req exp mod null]
    return 1;
}

static duk_ret_t
appSBAddRoute(duk_context *ctx) {
    duk_require_function(ctx, 0);
    duk_push_this(ctx);                      // [fn app]
    duk_get_prop_string(ctx, -1, "_routes"); // [fn app routes]
    duk_size_t l = duk_get_length(ctx, -1);
    duk_swap_top(ctx, -3);                   // [routes app fn]
    duk_put_prop_index(ctx, 0, l);           // [routes app]
    duk_swap_top(ctx, -2);                   // [app routes]
    duk_put_prop_string(ctx, -2, "_routes");
    return 0;
}
