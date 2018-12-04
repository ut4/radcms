#include "../include/common-script-bindings.h"

#define KEY_DB_C_PTR "_dbCPtr"
#define KEY_ROW_JS_PROTO "_ResultRowJsPrototype"
#define KEY_CUR_ROW_COL_COUNT "_curResultRowColCount"
#define KEY_CUR_STMT_C_PTR "_curSqliteStmtCPtr"
#define KEY_SERVICES_JS_IMPL "_servicesJsImpl"
#define JS_MAPPER_FAIL -2

/** Implements Duktape.modSearch */
static duk_ret_t
commonSBSearchModule(duk_context *ctx);

/** Implements app.addRoute(<matcherFn>) */
static duk_ret_t
appSBAddRoute(duk_context *ctx);

/** Implements db.selectAll(<sql>, <bindings>, <mapFn>) */
static duk_ret_t
dbSBSelectAll(duk_context *ctx);

/** Implements row.getInt(<idx>) */
static duk_ret_t
dbSBResultRowGetInt(duk_context *ctx);

/** Implements row.getString(<idx>) */
static duk_ret_t
dbSBResultRowGetString(duk_context *ctx);

void
commonScriptBindingsRegister(duk_context *ctx, Db *db, char* err) {
    // global.Duktape.modSearch
    duk_get_global_string(ctx, "Duktape");             // [obj]
    duk_push_c_function(ctx, commonSBSearchModule, 4); // [obj fn]
    duk_put_prop_string(ctx, -2, "modSearch");         // [obj]
    duk_pop(ctx);                                      // []
    // global.Request
    static const char *globalCode = "function Response(statusCode, body) {"
        "if (statusCode < 100) throw new TypeError(\"Not valid status code: \", statusCode);"
        "this.statusCode = statusCode; this.body = body || \"\";"
    "}";
    if (!dukUtilsCompileAndRunStrGlobal(ctx, globalCode, "insane-common.js", err)) return;
    // threadStash._dbCPtr
    duk_push_thread_stash(ctx, ctx);                   // [stash]
    duk_push_pointer(ctx, db);                         // [stash ptr]
    duk_put_prop_string(ctx, -2, KEY_DB_C_PTR);        // [stash]
    // services.db
    duk_push_bare_object(ctx);                         // [stash srvcs]
    duk_push_bare_object(ctx);                         // [stash srvcs db]
    duk_push_c_lightfunc(ctx, dbSBSelectAll, 2, 0, 0); // [stash srvcs db fn]
    duk_put_prop_string(ctx, -2, "selectAll");         // [stash srvcs db]
    duk_put_prop_string(ctx, -2, "db");                // [stash srvcs]
    // services.app
    duk_push_bare_object(ctx);                         // [stash srvcs app]
    duk_push_c_lightfunc(ctx, appSBAddRoute, 1, 0, 0); // [stash srvcs app fn]
    duk_put_prop_string(ctx, -2, "addRoute");          // [stash srvcs app]
    duk_push_array(ctx);                               // [stash srvcs app routes]
    duk_put_prop_string(ctx, -2, "_routes");           // [stash srvcs app]
    duk_put_prop_string(ctx, -2, "app");               // [stash srvcs]
    // threadStash.services
    duk_put_prop_string(ctx, -2, KEY_SERVICES_JS_IMPL); // [stash]
    // threadStash._ResultRowJsPrototype
    duk_push_bare_object(ctx);                         // [stash row]
    duk_push_c_lightfunc(ctx, dbSBResultRowGetInt, 1, 0, 0); // [stash row fn]
    duk_put_prop_string(ctx, -2, "getInt");            // [stash row]
    duk_push_c_lightfunc(ctx, dbSBResultRowGetString, 1, 0, 0); // [stash row fn]
    duk_put_prop_string(ctx, -2, "getString");         // [stash row]
    duk_put_prop_string(ctx, -2, KEY_ROW_JS_PROTO);    // [stash]
    duk_pop_n(ctx, 1);                                 // []
}

#define pushService(name, threadStashIsAt) \
    duk_get_prop_string(ctx, threadStashIsAt, KEY_SERVICES_JS_IMPL); \
    duk_get_prop_string(ctx, -1, name); \
    duk_remove(ctx, -2)

void
commonScriptBindingsPushDb(duk_context *ctx, int threadStashIsAt) {
    pushService("db", threadStashIsAt);
}

void
commonScriptBindingsPushApp(duk_context *ctx, int threadStashIsAt) {
    pushService("app", threadStashIsAt);
}

static duk_ret_t
commonSBSearchModule(duk_context *ctx) {
    const char *id = duk_get_string(ctx, 0);
    duk_push_thread_stash(ctx, ctx);        // [id req exp mod stash]
    if (strcmp(id, "app") == 0) {
        duk_push_number(ctx, 1);
    } else if (strcmp(id, "services") == 0) {
        duk_get_prop_string(ctx, -1, KEY_SERVICES_JS_IMPL);
    } else {
        duk_pop(ctx);                       // [id req exp mod]
        return duk_error(ctx, DUK_ERR_ERROR, "Module '%s' not found", id);
    }
                                            // [id req exp mod stash out]
    duk_put_prop_string(ctx, 3, "exports"); // [id req exp mod stash]
    duk_pop(ctx);                           // [id req exp mod]
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

static bool
sendDbResultRowToJsMapper(sqlite3_stmt *stmt, void **myPtr) {
                                                      // [str fn stash]
    duk_context *ctx = *myPtr;
    duk_dup(ctx, -2);                                 // [str fn stash fn]
    duk_push_int(ctx, sqlite3_column_count(stmt));    // [str fn stash fn int]
    duk_put_prop_string(ctx, -3, KEY_CUR_ROW_COL_COUNT); // [str fn stash fn]
    duk_push_pointer(ctx, stmt);                      // [str fn stash fn ptr]
    duk_put_prop_string(ctx, -3, KEY_CUR_STMT_C_PTR); // [str fn stash fn]
    // Push new ResultRow();
    duk_push_bare_object(ctx);                        // [str fn stash fn obj]
    duk_get_prop_string(ctx, -3, KEY_ROW_JS_PROTO);   // [str fn stash fn obj obj]
    duk_set_prototype(ctx, -2);                       // [str fn stash fn obj]
    // call myMapper(row)
    bool ok = duk_pcall(ctx, 1) == 0;                 // [str fn stash undefined|err]
    duk_del_prop_string(ctx, -2, KEY_CUR_STMT_C_PTR);
    duk_del_prop_string(ctx, -2, KEY_CUR_ROW_COL_COUNT);
    if (ok) { duk_pop(ctx); }                         // [str fn stash]
    return ok;                                        // [str fn stash err?]
}

static duk_ret_t
dbSBSelectAll(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_push_thread_stash(ctx, ctx);            // [str fn stash]
    char err[ERR_BUF_LEN]; err[0] = '\0';
    duk_get_prop_string(ctx, -1, KEY_DB_C_PTR); // [str fn stash ptr]
    Db *db = duk_to_pointer(ctx, -1);
    duk_pop(ctx);                               // [str fn stash]
    bool res = dbSelect(db, sql, sendDbResultRowToJsMapper, (void*)&ctx, err);
    if (res) {                                  // [str fn stash]
        duk_push_boolean(ctx, true);            // [str fn stash bool]
        return 1;
    }                                           // [str fn stash err]
    return duk_error(ctx, DUK_ERR_ERROR, "%s",
                     strlen(err) ? err : duk_safe_to_string(ctx, -1));
}

#define getVal(dukPushFn, sqliteGetterFn) \
    int idx = duk_require_int(ctx, 0); \
    duk_push_thread_stash(ctx, ctx); \
    duk_get_prop_string(ctx, -1, KEY_CUR_STMT_C_PTR); \
    sqlite3_stmt *stmt = duk_to_pointer(ctx, -1); \
    duk_get_prop_string(ctx, -2, KEY_CUR_ROW_COL_COUNT);  \
    if (idx < duk_to_int(ctx, -1)) { \
        dukPushFn(ctx, sqliteGetterFn(stmt, idx)); \
    } else { \
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, ""); \
    } \
    return 1

static duk_ret_t
dbSBResultRowGetInt(duk_context *ctx) {
    getVal(duk_push_number, sqlite3_column_int);
}

static duk_ret_t
dbSBResultRowGetString(duk_context *ctx) {
    getVal(duk_push_string, (const char*)sqlite3_column_text);
}
