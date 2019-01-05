#include "../../include/common-services-js-bindings.hpp"

static duk_ret_t dbInsert(duk_context *ctx);
static duk_ret_t dbSelectAll(duk_context *ctx);
static duk_ret_t dbStmtBindInt(duk_context *ctx);
static duk_ret_t dbStmtBindString(duk_context *ctx);
static duk_ret_t dbResRowGetInt(duk_context *ctx);
static duk_ret_t dbResRowGetString(duk_context *ctx);

constexpr const char* KEY_STMT_JS_PROTO = "_StmtProto";
constexpr const char* KEY_RES_ROW_JS_PROTO = "_ResRowProto";
constexpr const char* KEY_CUR_ROW_COL_COUNT = "_curResultRowColCount";
constexpr const char* KEY_CUR_STMT_PTR = "_curSqliteStmtCPtr";
constexpr const char* KEY_CUR_STMT_MAX_BIND_IDX = DUK_HIDDEN_SYMBOL("_curStmtMaxPlaceholderIdx");

void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    // module.db
    duk_get_prop_string(ctx, exportsIsAt, "db");        // [? db]
    duk_push_c_lightfunc(ctx, dbInsert, 2, 0, 0);       // [? db lightfn]
    duk_put_prop_string(ctx, -2, "insert");             // [? db]
    duk_push_c_lightfunc(ctx, dbSelectAll, 2, 0, 0);    // [? db lightfn]
    duk_put_prop_string(ctx, -2, "selectAll");          // [? db]
    //duk_put_prop_string(ctx, exportsIsAt, "db");// [?]
    duk_pop(ctx);// [?]
    // dukStash._StmtJsPrototype
    duk_push_global_stash(ctx);                         // [? stash]
    duk_push_bare_object(ctx);                          // [? stash StmtProto]
    duk_push_c_lightfunc(ctx, dbStmtBindInt, 2, 0, 0);  // [? stash StmtProto lightfn]
    duk_put_prop_string(ctx, -2, "bindInt");            // [? stash StmtProto]
    duk_push_c_lightfunc(ctx, dbStmtBindString, 2, 0, 0); // [? stash StmtProto lightfn]
    duk_put_prop_string(ctx, -2, "bindString");         // [? stash StmtProto]
    duk_put_prop_string(ctx, -2, KEY_STMT_JS_PROTO);    // [? stash]
    // dukStash._ResultRowJsPrototype
    duk_push_bare_object(ctx);                          // [? stash RowProto]
    duk_push_c_lightfunc(ctx, dbResRowGetInt, 1, 0, 0); // [? stash RowProto lightfn]
    duk_put_prop_string(ctx, -2, "getInt");             // [? stash RowProto]
    duk_push_c_lightfunc(ctx, dbResRowGetString, 1, 0, 0); // [? stash RowProto lightfn]
    duk_put_prop_string(ctx, -2, "getString");          // [? stash RowProto]
    duk_put_prop_string(ctx, -2, KEY_RES_ROW_JS_PROTO); // [? stash]
    duk_pop(ctx);                                       // [?]
}

static bool
callJsStmtBindFn(sqlite3_stmt *stmt, void *myPtr) {
                                                      // [str stash fn]
    auto *ctx = static_cast<duk_context*>(myPtr);
    // Push new Stmt();
    duk_push_bare_object(ctx);                        // [str stash fn stmt]
    duk_get_prop_string(ctx, -3, KEY_STMT_JS_PROTO);  // [str stash fn stmt proto]
    duk_set_prototype(ctx, -2);                       // [str stash fn stmt]
    duk_push_pointer(ctx, stmt);                      // [str stash fn stmt ptr]
    duk_put_prop_string(ctx, -2, KEY_CUR_STMT_PTR);
    duk_push_int(ctx, sqlite3_bind_parameter_count(stmt) - 1);// [str stash fn stmt int]
    duk_put_prop_string(ctx, -2, KEY_CUR_STMT_MAX_BIND_IDX);
    // call bindFn(stmt)
    bool ok = duk_pcall(ctx, 1) == DUK_EXEC_SUCCESS;  // [str stash undefined|err]
    if (ok) { duk_pop(ctx); }                         // [str stash]
    return ok;                                        // [str stash err?]
}

static duk_ret_t
dbInsert(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    duk_push_global_stash(ctx);                  // [str fn stash]
    AppContext* app = jsEnvironmentPullAppContext(ctx, -1);
    duk_swap_top(ctx, -2);                       // [str stash fn]
    int res = app->db->insert(sql, callJsStmtBindFn, ctx, app->errBuf);
    if (res > -1) {                              // [str stash]
        duk_push_int(ctx, res);                  // [str stash insertId]
        return 1;
    }                                            // [str stash err]
    return duk_error(ctx, DUK_ERR_ERROR, "%s",
                     !app->errBuf.empty() ? app->errBuf.c_str() : duk_safe_to_string(ctx, -1));
}

static bool
callJsResultRowMapFn(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow) {
                                                      // [str fn stash]
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_dup(ctx, -2);                                 // [str fn stash fn]
    duk_push_int(ctx, sqlite3_column_count(stmt));    // [str fn stash fn int]
    duk_put_prop_string(ctx, -3, KEY_CUR_ROW_COL_COUNT); // [str fn stash fn]
    duk_push_pointer(ctx, stmt);                      // [str fn stash fn ptr]
    duk_put_prop_string(ctx, -3, KEY_CUR_STMT_PTR);   // [str fn stash fn]
    // Push new ResultRow();
    duk_push_bare_object(ctx);                        // [str fn stash fn row]
    duk_get_prop_string(ctx, -3, KEY_RES_ROW_JS_PROTO);// [str fn stash fn row proto]
    duk_set_prototype(ctx, -2);                       // [str fn stash fn row]
    duk_push_uint(ctx, nthRow);                       // [str fn stash fn row int]
    // call mapFn(row)
    bool ok = duk_pcall(ctx, 2) == DUK_EXEC_SUCCESS;  // [str fn stash undefined|err]
    duk_del_prop_string(ctx, -2, KEY_CUR_STMT_PTR);
    duk_del_prop_string(ctx, -2, KEY_CUR_ROW_COL_COUNT);
    if (ok) { duk_pop(ctx); }                         // [str fn stash]
    return ok;                                        // [str fn stash err?]
}

static duk_ret_t
dbSelectAll(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_push_global_stash(ctx);                 // [str fn stash]
    AppContext *app = jsEnvironmentPullAppContext(ctx, -1);
    bool res = app->db->select(sql, callJsResultRowMapFn, ctx, app->errBuf);
    if (res) {                                  // [str fn stash]
        duk_push_boolean(ctx, true);            // [str fn stash bool]
        return 1;
    }                                           // [str fn stash err]
    return duk_error(ctx, DUK_ERR_ERROR, "%s",
                     !app->errBuf.empty() ? app->errBuf.c_str() : duk_safe_to_string(ctx, -1));
}

#define pullInsertStmt(stmt, placeholderIdx) \
    duk_push_this(ctx); \
    duk_get_prop_string(ctx, -1, KEY_CUR_STMT_MAX_BIND_IDX); \
    if (placeholderIdx > duk_get_uint(ctx, -1)) return duk_error(ctx, \
        DUK_ERR_RANGE_ERROR, "Bind index %u too large (max %u)", \
        placeholderIdx, duk_get_int(ctx, -1)); \
    duk_get_prop_string(ctx, -2, KEY_CUR_STMT_PTR); \
    stmt = static_cast<sqlite3_stmt*>(duk_get_pointer(ctx, -1))

static duk_ret_t
dbStmtBindInt(duk_context *ctx) {
    unsigned placeholderIdx = duk_require_uint(ctx, 0); // 1st. arg
    int value = duk_require_int(ctx, 1);                // 2nd. arg
    sqlite3_stmt *stmt;
    pullInsertStmt(stmt, placeholderIdx);
    duk_push_boolean(ctx, sqlite3_bind_int(stmt, placeholderIdx + 1,
                                           value) == SQLITE_OK);
    return 1;
}

static duk_ret_t
dbStmtBindString(duk_context *ctx) {
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
    duk_get_prop_string(ctx, -1, KEY_CUR_STMT_PTR); \
    auto *stmt = static_cast<sqlite3_stmt*>(duk_get_pointer(ctx, -1)); \
    duk_get_prop_string(ctx, -2, KEY_CUR_ROW_COL_COUNT);  \
    if (colIdx < duk_get_int(ctx, -1)) { \
        dukPushFn(ctx, sqliteGetterFn(stmt, colIdx)); \
    } else { \
        return duk_error(ctx, DUK_ERR_RANGE_ERROR, "Col index %d too large " \
                         "(max %d)", colIdx, duk_get_int(ctx, -1)-1); \
    } \
    return 1

static duk_ret_t
dbResRowGetInt(duk_context *ctx) {
    getVal(duk_push_int, sqlite3_column_int);
}

static duk_ret_t
dbResRowGetString(duk_context *ctx) {
    getVal(duk_push_string, (const char*)sqlite3_column_text);
}
