#include "../include/common-script-bindings.h"

#define KEY_DB_C_PTR "_dbCPtr"
#define KEY_DB_JS_IMPL "_dbJsImpl"
#define KEY_ROW_JS_PROTO "_ResultRowJsPrototype"
#define KEY_CUR_ROW_COL_COUNT "_curResultRowColCount"
#define KEY_CUR_STMT_C_PTR "_curSqliteStmtCPtr"
#define JS_MAPPER_FAIL -2

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
    /*
     * http
     */
    static const char *globalCode = "function Response(statusCode, body) {"
        "if (statusCode < 100) throw new TypeError(\"Not valid status code: \", statusCode);"
        "this.statusCode = statusCode; this.body = body || \"\";"
    "}";
    duk_push_string(ctx, "insane-common.js");        // [str]
    if (duk_pcompile_string_filename(ctx, DUK_COMPILE_STRICT,       // [fn|err]
                                     globalCode) != 0) {
        dukUtilsPutDetailedError(ctx, -1, "insane-common.js", err); // []
        return;
    }
    duk_call(ctx, 0);                                  // [undef]
    /*
     * db
     */
    duk_push_thread_stash(ctx, ctx);                   // [undef stash]
    duk_push_pointer(ctx, db);                         // [undef stash ptr]
    duk_put_prop_string(ctx, -2, KEY_DB_C_PTR);        // [undef stash]
    //
    duk_push_bare_object(ctx);                         // [undef stash obj]
    duk_push_c_lightfunc(ctx, dbSBSelectAll, 2, 0, 0); // [undef stash obj fn]
    duk_put_prop_string(ctx, -2, "selectAll");         // [undef stash obj]
    duk_put_prop_string(ctx, -2, KEY_DB_JS_IMPL);      // [undef stash]
    //
    duk_push_bare_object(ctx);                         // [undef stash obj]
    duk_push_c_lightfunc(ctx, dbSBResultRowGetInt, 1, 0, 0); // [undef stash obj fn]
    duk_put_prop_string(ctx, -2, "getInt");            // [undef stash obj]
    duk_push_c_lightfunc(ctx, dbSBResultRowGetString, 1, 0, 0); // [undef stash obj fn]
    duk_put_prop_string(ctx, -2, "getString");         // [undef stash obj]
    duk_put_prop_string(ctx, -2, KEY_ROW_JS_PROTO);    // [undef stash]
    duk_pop_n(ctx, 2);                                 // []
}

void
commonScriptBindingsPushDbSingleton(duk_context *ctx, int threadStashIsAt) {
    duk_get_prop_string(ctx, threadStashIsAt, KEY_DB_JS_IMPL);
}

static bool
sendDbResultRowToJsMapper(sqlite3_stmt *stmt, void **myPtr) {
                                                      // [str stash fn]
    duk_context *ctx = *myPtr;
    duk_dup(ctx, -1); // for next row                 // [str stash fn fn]
    duk_push_int(ctx, sqlite3_column_count(stmt));    // [str stash fn fn int]
    duk_put_prop_string(ctx, -4, KEY_CUR_ROW_COL_COUNT); // [str stash fn fn]
    duk_push_pointer(ctx, stmt);                      // [str stash fn fn ptr]
    duk_put_prop_string(ctx, -4, KEY_CUR_STMT_C_PTR); // [str stash fn fn]
    // Push new ResultRow();
    duk_push_bare_object(ctx);                        // [str stash fn fn obj]
    duk_get_prop_string(ctx, -4, KEY_ROW_JS_PROTO);   // [str stash fn fn obj obj]
    duk_set_prototype(ctx, -2);                       // [str stash fn fn obj]
    // call myMapper(row)
    bool ok = duk_pcall(ctx, 1) == 0;                 // [str stash fn undefined|err]
    duk_del_prop_string(ctx, -3, KEY_CUR_STMT_C_PTR);
    duk_del_prop_string(ctx, -3, KEY_CUR_ROW_COL_COUNT);
    if (ok) { duk_pop(ctx); }                         // [str stash fn]
    return ok;                                        // [str stash fn err?]
}

static duk_ret_t
dbSBSelectAll(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_push_thread_stash(ctx, ctx);            // [str fn stash]
    duk_swap_top(ctx, -2);                      // [str stash fn]
    char err[ERR_BUF_LEN];
    duk_get_prop_string(ctx, -2, KEY_DB_C_PTR); // [str stash fn ptr]
    Db *db = duk_to_pointer(ctx, -1);
    duk_pop(ctx);                               // [str stash fn]
    bool res = dbSelect(db, sql, sendDbResultRowToJsMapper, (void*)&ctx, err);
    if (res) {                                  // [str stash fn]
        duk_push_boolean(ctx, true);            // [str stash fn bool]
        return 1;
    }                                           // [str stash fn err]
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
