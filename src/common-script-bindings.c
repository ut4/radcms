#include "../include/common-script-bindings.h"

#define KEY_SELF_C_PTR "_commonScriptBindingsCtxCPtr"
#define KEY_ROW_JS_PROTO "_ResultRowJsPrototype"
#define KEY_STMT_JS_PROTO DUK_HIDDEN_SYMBOL("_StmtJsPrototype")
#define KEY_CUR_ROW_COL_COUNT "_curResultRowColCount"
#define KEY_CUR_STMT_C_PTR "_curSqliteStmtCPtr"
#define KEY_CUR_STMT_MAX_BIND_IDX DUK_HIDDEN_SYMBOL("_curStmtMaxPlaceholderIdx")
#define KEY_SERVICES_JS_IMPL "_servicesJsImpl"
#define KEY_DIRECTIVE_REGISTER_JS_IMPL "_directiveRegisterJsImpl"
#define JS_MAPPER_FAIL -2

// Stuff used by the scripts
typedef struct {
    Db *db;
    char *appPath;
    char *errBuf;
} CommonScriptBindingsCtx;

/** Implements Duktape.modSearch */
static duk_ret_t
commonSBSearchModule(duk_context *ctx);

/** Implements app.addRoute(<matcherFn>) */
static duk_ret_t
appSBAddRoute(duk_context *ctx);

/** Implements db.insert(<sql>, <bindFn>) */
static duk_ret_t
dbSBInsert(duk_context *ctx);

/** Implements db.selectAll(<sql>, <mapFn>) */
static duk_ret_t
dbSBSelectAll(duk_context *ctx);

/** Implements row.bindInt(<placeholderIdx>, <int>) */
static duk_ret_t
dbSBStmtBindInt(duk_context *ctx);

/** Implements stmt.bindString(<placeholderIdx>, <str>) */
static duk_ret_t
dbSBStmtBindString(duk_context *ctx);

/** Implements row.getInt(<fieldIdx>) */
static duk_ret_t
dbSBResultRowGetInt(duk_context *ctx);

/** Implements row.getString(<fieldIdx>) */
static duk_ret_t
dbSBResultRowGetString(duk_context *ctx);

/** Implements directiveRegister.get(<directiveName>) */
static duk_ret_t
directiveRegisterSBGetDirective(duk_context *ctx);

void
commonScriptBindingsInit(duk_context *ctx, Db *db, char *appPath, char* err) {
    // global.Duktape.modSearch
    duk_get_global_string(ctx, "Duktape");             // [obj]
    duk_push_c_function(ctx, commonSBSearchModule, 4); // [obj fn]
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
    if (!dukUtilsCompileAndRunStrGlobal(ctx, globalCode, "insane-common.js", err)) return;
    duk_push_global_stash(ctx);                        // [stash]
    // dukStash._dbCPtr && dukStask._errCPtr
    CommonScriptBindingsCtx *caccess = NULL;
    if (db || appPath) {
        caccess = ALLOCATE(CommonScriptBindingsCtx);
        caccess->db = db;
        caccess->appPath = appPath;
        caccess->errBuf = err;
    }
    duk_push_pointer(ctx, caccess);                    // [stash ptr]
    duk_put_prop_string(ctx, -2, KEY_SELF_C_PTR);      // [stash]
    // services.db
    duk_push_bare_object(ctx);                         // [stash srvcs]
    duk_push_bare_object(ctx);                         // [stash srvcs db]
    duk_push_c_lightfunc(ctx, dbSBInsert, 2, 0, 0);    // [stash srvcs db lightfn]
    duk_put_prop_string(ctx, -2, "insert");            // [stash srvcs db]
    duk_push_c_lightfunc(ctx, dbSBSelectAll, 2, 0, 0); // [stash srvcs db lightfn]
    duk_put_prop_string(ctx, -2, "selectAll");         // [stash srvcs db]
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
    // dukStash._StmtJsPrototype
    duk_push_bare_object(ctx);                         // [stash StmtProto]
    duk_push_c_lightfunc(ctx, dbSBStmtBindInt, 2, 0, 0); // [stash StmtProto lightfn]
    duk_put_prop_string(ctx, -2, "bindInt");           // [stash StmtProto]
    duk_push_c_lightfunc(ctx, dbSBStmtBindString, 2, 0, 0); // [stash StmtProto lightfn]
    duk_put_prop_string(ctx, -2, "bindString");        // [stash StmtProto]
    duk_put_prop_string(ctx, -2, KEY_STMT_JS_PROTO);   // [stash]
    // dukStash._ResultRowJsPrototype
    duk_push_bare_object(ctx);                         // [stash RowProto]
    duk_push_c_lightfunc(ctx, dbSBResultRowGetInt, 1, 0, 0); // [stash RowProto lightfn]
    duk_put_prop_string(ctx, -2, "getInt");            // [stash RowProto]
    duk_push_c_lightfunc(ctx, dbSBResultRowGetString, 1, 0, 0); // [stash RowProto lightfn]
    duk_put_prop_string(ctx, -2, "getString");         // [stash RowProto]
    duk_put_prop_string(ctx, -2, KEY_ROW_JS_PROTO);    // [stash]
    // dukStash._directiveRegisterJsImpl
    duk_push_bare_object(ctx);                         // [stash dirreg]
    duk_push_bare_object(ctx);                         // [stash dirreg entries]
    duk_put_prop_string(ctx, -2, "_entries");          // [stash dirreg]
    duk_push_c_lightfunc(ctx, directiveRegisterSBGetDirective, 1, 0, 0); // [stash dirreg lightfn]
    duk_put_prop_string(ctx, -2, "get");               // [stash dirreg]
    duk_put_prop_string(ctx, -2, KEY_DIRECTIVE_REGISTER_JS_IMPL); // [stash]
    duk_pop(ctx);                                      // []
}

void
commonScriptBindingsClean(duk_context *ctx) {
    duk_push_global_stash(ctx);                   // [stash]
    duk_get_prop_string(ctx, -1, KEY_SELF_C_PTR); // [stash ptr]
    FREE(CommonScriptBindingsCtx, duk_get_pointer(ctx, -1));
    duk_pop_n(ctx, 2);                            // []
}

void
commonScriptBindingsPushServices(duk_context *ctx, int dukStashIsAt) {
    duk_get_prop_string(ctx, dukStashIsAt, KEY_SERVICES_JS_IMPL);
}

void
commonScriptBindingsPushDb(duk_context *ctx, int dukStashIsAt) {
    commonScriptBindingsPushServices(ctx, dukStashIsAt); // [? srvcs]
    duk_get_prop_string(ctx, -1, "db");                  // [? srvcs db]
    duk_remove(ctx, -2);                                 // [? db]
}

void
commonScriptBindingsPushApp(duk_context *ctx, int dukStashIsAt) {
    commonScriptBindingsPushServices(ctx, dukStashIsAt); // [? srvcs]
    duk_get_prop_string(ctx, -1, "app");                 // [? srvcs app]
    duk_remove(ctx, -2);                                 // [? app]
}

void
commonScriptBindingsPushDirectiveRegister(duk_context *ctx, int dukStashItAt) {
    duk_get_prop_string(ctx, dukStashItAt, KEY_DIRECTIVE_REGISTER_JS_IMPL);
}

void
commonScriptBindingsPutDirective(duk_context *ctx, const char *directiveName,
                                 int dukStashIsAt) {
                                                        // [? fn]
    ASSERT(duk_is_function(ctx, -1), "Stack top must be a function");
    commonScriptBindingsPushDirectiveRegister(ctx, dukStashIsAt); // [? fn dirreg]
    duk_get_prop_string(ctx, -1, "_entries");           // [? fn dirreg entriesObj]
    duk_swap_top(ctx, -3);                              // [? entriesObj dirreg fn]
    duk_remove(ctx, -2);                                // [? entriesObj fn]
    duk_put_prop_string(ctx, -2, directiveName);        // [? entriesObj]
    duk_pop(ctx);                                       // [?]
}

static duk_ret_t
commonSBSearchModule(duk_context *ctx) {
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

static bool
callJsStmtBindFn(sqlite3_stmt *stmt, void *myPtr) {
                                                      // [str stash fn]
    duk_context *ctx = myPtr;
    // Push new Stmt();
    duk_push_bare_object(ctx);                        // [str stash fn stmt]
    duk_get_prop_string(ctx, -3, KEY_STMT_JS_PROTO);  // [str stash fn stmt proto]
    duk_set_prototype(ctx, -2);                       // [str stash fn stmt]
    duk_push_pointer(ctx, stmt);                      // [str stash fn stmt ptr]
    duk_put_prop_string(ctx, -2, KEY_CUR_STMT_C_PTR);
    duk_push_int(ctx, sqlite3_bind_parameter_count(stmt) - 1);// [str stash fn stmt int]
    duk_put_prop_string(ctx, -2, KEY_CUR_STMT_MAX_BIND_IDX);
    // call bindFn(stmt)
    bool ok = duk_pcall(ctx, 1) == DUK_EXEC_SUCCESS;  // [str stash undefined|err]
    if (ok) { duk_pop(ctx); }                         // [str stash]
    return ok;                                        // [str stash err?]
}

static duk_ret_t
dbSBInsert(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    duk_push_global_stash(ctx);                  // [str fn stash]
    duk_get_prop_string(ctx, -1, KEY_SELF_C_PTR);// [str fn stash ptr]
    CommonScriptBindingsCtx *caccess = duk_get_pointer(ctx, -1);
    char *err = caccess->errBuf;
    duk_pop(ctx);                                // [str fn stash]
    duk_swap_top(ctx, -2);                       // [str stash fn]
    int res = dbInsert(caccess->db, sql, callJsStmtBindFn, ctx, err);
    if (res > -1) {                              // [str stash]
        duk_push_int(ctx, res);                  // [str stash insertId]
        return 1;
    }                                            // [str stash err]
    return duk_error(ctx, DUK_ERR_ERROR, "%s",
                     strlen(err) ? err : duk_safe_to_string(ctx, -1));
}

static bool
callJsResultRowMapFn(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow) {
                                                      // [str fn stash]
    duk_context *ctx = myPtr;
    duk_dup(ctx, -2);                                 // [str fn stash fn]
    duk_push_int(ctx, sqlite3_column_count(stmt));    // [str fn stash fn int]
    duk_put_prop_string(ctx, -3, KEY_CUR_ROW_COL_COUNT); // [str fn stash fn]
    duk_push_pointer(ctx, stmt);                      // [str fn stash fn ptr]
    duk_put_prop_string(ctx, -3, KEY_CUR_STMT_C_PTR); // [str fn stash fn]
    // Push new ResultRow();
    duk_push_bare_object(ctx);                        // [str fn stash fn row]
    duk_get_prop_string(ctx, -3, KEY_ROW_JS_PROTO);   // [str fn stash fn row proto]
    duk_set_prototype(ctx, -2);                       // [str fn stash fn row]
    duk_push_uint(ctx, nthRow);                       // [str fn stash fn row int]
    // call mapFn(row)
    bool ok = duk_pcall(ctx, 2) == DUK_EXEC_SUCCESS;  // [str fn stash undefined|err]
    duk_del_prop_string(ctx, -2, KEY_CUR_STMT_C_PTR);
    duk_del_prop_string(ctx, -2, KEY_CUR_ROW_COL_COUNT);
    if (ok) { duk_pop(ctx); }                         // [str fn stash]
    return ok;                                        // [str fn stash err?]
}

static duk_ret_t
dbSBSelectAll(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_push_global_stash(ctx);                 // [str fn stash]
    duk_get_prop_string(ctx, -1, KEY_SELF_C_PTR);// [str fn stash ptr]
    CommonScriptBindingsCtx *caccess = duk_get_pointer(ctx, -1);
    char *err = caccess->errBuf;
    duk_pop(ctx);                               // [str fn stash]
    bool res = dbSelect(caccess->db, sql, callJsResultRowMapFn, ctx, err);
    if (res) {                                  // [str fn stash]
        duk_push_boolean(ctx, true);            // [str fn stash bool]
        return 1;
    }                                           // [str fn stash err]
    return duk_error(ctx, DUK_ERR_ERROR, "%s",
                     strlen(err) ? err : duk_safe_to_string(ctx, -1));
}

#define pullInsertStmt(stmt, placeholderIdx) \
    duk_push_this(ctx); \
    duk_get_prop_string(ctx, -1, KEY_CUR_STMT_MAX_BIND_IDX); \
    if (placeholderIdx > duk_get_int(ctx, -1)) return duk_error(ctx, \
        DUK_ERR_RANGE_ERROR, "Bind index %u too large (max %u)", \
        placeholderIdx, duk_get_int(ctx, -1)); \
    duk_get_prop_string(ctx, -2, KEY_CUR_STMT_C_PTR); \
    stmt = duk_get_pointer(ctx, -1)

static duk_ret_t
dbSBStmtBindInt(duk_context *ctx) {
    unsigned placeholderIdx = duk_require_uint(ctx, 0); // 1st. arg
    int value = duk_require_int(ctx, 1);                // 2nd. arg
    sqlite3_stmt *stmt;
    pullInsertStmt(stmt, placeholderIdx);
    duk_push_boolean(ctx, sqlite3_bind_int(stmt, placeholderIdx + 1,
                                           value) == SQLITE_OK);
    return 1;
}

static duk_ret_t
dbSBStmtBindString(duk_context *ctx) {
    unsigned placeholderIdx = duk_require_uint(ctx, 0); // 1st. arg
    const char *value = duk_require_string(ctx, 1);     // 2nd. arg
    sqlite3_stmt *stmt;
    pullInsertStmt(stmt, placeholderIdx);
    duk_push_boolean(ctx, sqlite3_bind_text(stmt, placeholderIdx + 1, value, -1,
                                            SQLITE_STATIC) == SQLITE_OK);
    return 1;
}

#define getVal(dukPushFn, sqliteGetterFn) \
    int colIdx = duk_require_int(ctx, 0); \
    duk_push_global_stash(ctx); \
    duk_get_prop_string(ctx, -1, KEY_CUR_STMT_C_PTR); \
    sqlite3_stmt *stmt = duk_get_pointer(ctx, -1); \
    duk_get_prop_string(ctx, -2, KEY_CUR_ROW_COL_COUNT);  \
    if (colIdx < duk_get_int(ctx, -1)) { \
        dukPushFn(ctx, sqliteGetterFn(stmt, colIdx)); \
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

static duk_ret_t
directiveRegisterSBGetDirective(duk_context *ctx) {
    duk_push_this(ctx);                                       // [str dirreg]
    duk_get_prop_string(ctx, -1, "_entries");                 // [str dirreg entries]
    duk_get_prop_string(ctx, -1, duk_require_string(ctx, 0)); // [str dirreg entries fn|undefined]
    return 1;
}
