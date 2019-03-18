#include "../../include/common-services-js-bindings.hpp"

static duk_ret_t dbConstruct(duk_context *ctx);
static duk_ret_t dbFinalize(duk_context *ctx);
static duk_ret_t dbInsertOrUpdate(duk_context *ctx, bool isInsert);
static duk_ret_t dbInsert(duk_context *ctx);
static duk_ret_t dbSelect(duk_context *ctx);
static duk_ret_t dbUpdate(duk_context *ctx);
static duk_ret_t dbStmtBindInt(duk_context *ctx);
static duk_ret_t dbStmtBindString(duk_context *ctx);
static duk_ret_t dbResRowGetInt(duk_context *ctx);
static duk_ret_t dbResRowGetString(duk_context *ctx);
static duk_ret_t fsWrite(duk_context *ctx);
static duk_ret_t fsRead(duk_context *ctx);
static duk_ret_t fsReadDir(duk_context *ctx);
static duk_ret_t fsMakeDirs(duk_context *ctx);
static duk_ret_t transpilerTranspileToFn(duk_context *ctx);
static duk_ret_t uploaderConstruct(duk_context *ctx);
static duk_ret_t uploaderFinalize(duk_context *ctx);
static duk_ret_t uploaderUploadString(duk_context *ctx);
static duk_ret_t uploaderUploadFile(duk_context *ctx);
static duk_ret_t uploaderDelete(duk_context *ctx);
static duk_ret_t domTreeConstruct(duk_context *ctx);
static duk_ret_t domTreeFinalize(duk_context *ctx);
static duk_ret_t domTreeCreateElement(duk_context *ctx);
static duk_ret_t domTreeRender(duk_context *ctx);
static duk_ret_t domTreeGetRenderedElems(duk_context *ctx);
static duk_ret_t domTreeGetRenderedFnComponents(duk_context *ctx);
static unsigned domTreeCallCmpFn(FuncNode *me, std::string &err);

constexpr const char* KEY_DB_PTR = DUK_HIDDEN_SYMBOL("_dbInstancePtr");
constexpr const char* KEY_STMT_JS_PROTO = "_StmtProto";
constexpr const char* KEY_RES_ROW_JS_PROTO = "_ResRowProto";
constexpr const char* KEY_CUR_ROW_MAP_FN = "_currentRowMapFn";
constexpr const char* KEY_ROW_COL_COUNT = DUK_HIDDEN_SYMBOL("_colCount");
constexpr const char* KEY_STMT_PTR = DUK_HIDDEN_SYMBOL("_sqliteStmtPtr");
constexpr const char* KEY_STMT_MAX_BIND_IDX = DUK_HIDDEN_SYMBOL("_maxPlaceholderIdx");
constexpr const char* KEY_UPLOADER_PTR = DUK_HIDDEN_SYMBOL("_uploaderInstancePtr");
constexpr const char* KEY_DOM_TREE_PTR = DUK_HIDDEN_SYMBOL("_domTreeInstancePtr");
constexpr const char* KEY_CMP_FUNCS = DUK_HIDDEN_SYMBOL("_domTreeCmpFuncs");

void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    // module.Db
    duk_push_c_function(ctx, dbConstruct, 1);           // [? Db]
    duk_push_bare_object(ctx);                          // [? Db proto]
    duk_push_c_lightfunc(ctx, dbInsert, 2, 0, 0);       // [? Db proto lightfn]
    duk_put_prop_string(ctx, -2, "insert");             // [? Db proto]
    duk_push_c_lightfunc(ctx, dbSelect, DUK_VARARGS, 0, 0);// [? Db proto lightfn]
    duk_put_prop_string(ctx, -2, "select");             // [? Db proto]
    duk_push_c_lightfunc(ctx, dbUpdate, 2, 0, 0);       // [? Db proto lightfn]
    duk_put_prop_string(ctx, -2, "update");             // [? Db proto]
    duk_get_prop_string(ctx, -1, "update");             // [? Db proto lightfn]
    duk_put_prop_string(ctx, -2, "delete");             // [? Db proto]
    duk_put_prop_string(ctx, -2, "prototype");          // [? Db]
    duk_put_prop_string(ctx, exportsIsAt, "Db");        // [?]
    // module.fs
    duk_get_prop_string(ctx, exportsIsAt, "fs");        // [? fs]
    duk_push_c_lightfunc(ctx, fsWrite, 2, 0, 0);        // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "write");              // [? fs]
    duk_push_c_lightfunc(ctx, fsRead, 1, 0, 0);         // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "read");               // [? fs]
    duk_push_c_lightfunc(ctx, fsReadDir, 2, 0, 0);      // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "readDir");            // [? fs]
    duk_push_c_lightfunc(ctx, fsMakeDirs, 1, 0, 0);     // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "makeDirs");           // [? fs]
    duk_pop(ctx);                                       // [?]
    // module.transpiler
    duk_get_prop_string(ctx, exportsIsAt, "transpiler");// [? transpiler]
    duk_push_c_lightfunc(ctx, transpilerTranspileToFn, DUK_VARARGS, 0, 0); // [? transpiler lightfn]
    duk_put_prop_string(ctx, -2, "transpileToFn");      // [? transpiler]
    duk_pop(ctx);                                       // [?]
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
    // module.Uploader
    duk_push_c_function(ctx, uploaderConstruct, 2);     // [? Uploader]
    duk_push_bare_object(ctx);                          // [? Uploader proto]
    duk_push_c_lightfunc(ctx, uploaderUploadString, 2, 0, 0); // [? Uploader proto lightfn]
    duk_put_prop_string(ctx, -2, "uploadString");       // [? Uploader proto]
    duk_push_c_lightfunc(ctx, uploaderUploadFile, 2, 0, 0); // [? Uploader proto lightfn]
    duk_put_prop_string(ctx, -2, "uploadFile");         // [? Uploader proto]
    duk_push_c_lightfunc(ctx, uploaderDelete, 3, 0, 0); // [? Uploader proto lightfn]
    duk_put_prop_string(ctx, -2, "delete");             // [? Uploader proto]
    duk_put_prop_string(ctx, -2, "prototype");          // [? Uploader]
    duk_put_prop_string(ctx, exportsIsAt, "Uploader");  // [?]
    // module.DomTree
    duk_push_c_function(ctx, domTreeConstruct, 0);      // [? DomTree]
    duk_push_bare_object(ctx);                          // [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeCreateElement, DUK_VARARGS, 0, 0); // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "createElement");      // [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeRender, 1, 0, 0);  // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "render");             // [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeGetRenderedElems, 0, 0, 0); // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "getRenderedElements");// [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeGetRenderedFnComponents, 0, 0, 0); // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "getRenderedFnComponents"); // [? DomTree proto]
    duk_put_prop_string(ctx, -2, "prototype");          // [? DomTree]
    duk_put_prop_string(ctx, exportsIsAt, "DomTree");   // [?]
}

Db*
commonServicesGetDbSelfPtr(duk_context *ctx, int thisIsAt) {
    duk_get_prop_string(ctx, thisIsAt, KEY_DB_PTR); // [? ptr]
    auto *out = static_cast<Db*>(duk_get_pointer(ctx, -1));
    duk_pop(ctx);                                   // [?]
    return out;
}

static duk_ret_t
dbConstruct(duk_context *ctx) {
    if (!duk_is_constructor_call(ctx)) return DUK_RET_TYPE_ERROR;
    const char *path = duk_require_string(ctx, 0);
    if (strlen(path) < 1) return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                                           "path is required");
    auto *self = new Db;
    std::string err;
    if (!self->open(path, err)) {
        delete self;
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, err.c_str());
    }
    duk_push_this(ctx);                       // [this]
    duk_push_pointer(ctx, self);              // [this ptr]
    duk_put_prop_string(ctx, -2, KEY_DB_PTR); // [this]
    duk_push_c_function(ctx, dbFinalize, 1);  // [this cfunc]
    duk_set_finalizer(ctx, -2);               // [this]
	return 0;
}

static duk_ret_t
dbFinalize(duk_context *ctx) {
                                             // [this]
    duk_get_prop_string(ctx, 0, KEY_DB_PTR); // [this ptr]
    delete static_cast<Db*>(duk_get_pointer(ctx, -1));
    return 0;
}

static bool
callJsStmtBindFn(sqlite3_stmt *stmt, void *myPtr) {
                                                      // [sql stash this fn]
    auto *ctx = static_cast<duk_context*>(myPtr);
    // Push new Stmt();
    duk_push_bare_object(ctx);                        // [sql stash this fn stmt]
    duk_push_pointer(ctx, stmt);                      // [sql stash this fn stmt ptr]
    duk_put_prop_string(ctx, -2, KEY_STMT_PTR);       // [sql stash this fn stmt]
    duk_push_int(ctx, sqlite3_bind_parameter_count(stmt) - 1);// [sql stash this fn stmt int]
    duk_put_prop_string(ctx, -2, KEY_STMT_MAX_BIND_IDX);// [sql stash this fn stmt]
    duk_get_prop_string(ctx, -4, KEY_STMT_JS_PROTO);  // [sql stash this fn stmt proto]
    duk_set_prototype(ctx, -2);                       // [sql stash this fn stmt]
    // call bindFn(stmt)
    bool ok = duk_pcall(ctx, 1) == DUK_EXEC_SUCCESS;  // [sql stash this undefined|err]
    if (ok) { duk_pop(ctx); }                         // [sql stash this]
    return ok;                                        // [sql stash this err?]
}

static duk_ret_t
dbInsertOrUpdate(duk_context *ctx, bool isInsert) {
    const char *sql = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    duk_push_this(ctx);                       // [sql fn this]
    duk_push_global_stash(ctx);               // [sql fn this stash]
    duk_swap_top(ctx, -3);                    // [sql stash this fn]
    Db *self = commonServicesGetDbSelfPtr(ctx, -2);
    std::string err;
    int res = isInsert
        ? self->insert(sql, callJsStmtBindFn, ctx, err)
        : self->update(sql, callJsStmtBindFn, ctx, err);
    if (res > -1) {                           // [sql stash this]
        duk_push_int(ctx, res);               // [sql stash this insertId]
        return 1;
    }                                         // [sql stash this err]
    return duk_error(ctx, DUK_ERR_ERROR, "%s", !err.empty()
        ? err.c_str()
        : duk_safe_to_string(ctx, -1));
}

static duk_ret_t
dbInsert(duk_context *ctx) {
    return dbInsertOrUpdate(ctx, true);
}

static bool
callJsResultRowMapFn(sqlite3_stmt *stmt, void *myPtr, unsigned rowIdx) {
                                                      // [sql stash this]
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_get_prop_string(ctx, -1, KEY_CUR_ROW_MAP_FN); // [sql stash this fn]
    // Push new ResultRow();
    duk_push_bare_object(ctx);                        // [sql stash this fn row]
    duk_push_int(ctx, sqlite3_column_count(stmt));    // [sql stash this fn row int]
    duk_put_prop_string(ctx, -2, KEY_ROW_COL_COUNT);  // [sql stash this fn row]
    duk_push_pointer(ctx, stmt);                      // [sql stash this fn row ptr]
    duk_put_prop_string(ctx, -2, KEY_STMT_PTR);       // [sql stash this fn row]
    duk_get_prop_string(ctx, -4, KEY_RES_ROW_JS_PROTO);// [sql stash this fn row proto]
    duk_set_prototype(ctx, -2);                       // [sql stash this fn row]
    duk_push_uint(ctx, rowIdx);                       // [sql stash this fn row int]
    // call mapFn(row)
    bool ok = duk_pcall(ctx, 2) == DUK_EXEC_SUCCESS;  // [sql stash this undefined|err]
    if (ok) { duk_pop(ctx); }                         // [sql stash this]
    return ok;                                        // [sql stash this err?]
}

static duk_ret_t
dbSelect(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    bool hasWhereBinder = duk_get_top(ctx) > 2 && duk_is_function(ctx, 2);
    duk_push_this(ctx);                         // [sql rowFn bindFn? this]
    duk_push_global_stash(ctx);                 // [sql rowFn bindFn? this stash]
    duk_swap_top(ctx, 1);                       // [sql stash bindFn? this rowFn]
    duk_put_prop_string(ctx, -2, KEY_CUR_ROW_MAP_FN); // [sql stash bindFn? this]
    if (duk_is_function(ctx, 2)) duk_swap_top(ctx, 2);// [sql stash this bindFn?]
    Db *self = commonServicesGetDbSelfPtr(ctx, 2);// [sql stash this bindFn?]
    std::string err;
    bool res = self->select(sql, callJsResultRowMapFn,
                            hasWhereBinder ? callJsStmtBindFn : nullptr, ctx, err);
    duk_push_null(ctx);                              // [sql stash this null]
    duk_put_prop_string(ctx, 2, KEY_CUR_ROW_MAP_FN); // [sql stash this]
    if (res) {                                  // [sql stash this]
        duk_push_boolean(ctx, true);            // [sql stash this bool]
        return 1;
    }
    return duk_error(ctx, DUK_ERR_ERROR, "%s", !err.empty()
        ? err.c_str()
        : duk_safe_to_string(ctx, -1));
}

static duk_ret_t
dbUpdate(duk_context *ctx) {
    return dbInsertOrUpdate(ctx, false);
}

#define pullInsertStmt(stmt, placeholderIdx) \
    duk_push_this(ctx); \
    duk_get_prop_string(ctx, -1, KEY_STMT_MAX_BIND_IDX); \
    if (placeholderIdx > duk_get_uint(ctx, -1)) return duk_error(ctx, \
        DUK_ERR_RANGE_ERROR, "Bind index %u too large (max %u)", \
        placeholderIdx, duk_get_int(ctx, -1)); \
    duk_get_prop_string(ctx, -2, KEY_STMT_PTR); \
    stmt = static_cast<sqlite3_stmt*>(duk_get_pointer(ctx, -1))

static duk_ret_t
dbStmtBindInt(duk_context *ctx) {
    unsigned placeholderIdx = duk_require_uint(ctx, 0); // 1st. arg
    sqlite3_stmt *stmt;
    pullInsertStmt(stmt, placeholderIdx);
    duk_push_boolean(ctx, (!duk_is_null(ctx, 1) ?        // 2nd. arg
        sqlite3_bind_int(stmt, placeholderIdx + 1, duk_require_int(ctx, 1)) :
        sqlite3_bind_null(stmt, placeholderIdx + 1)) == SQLITE_OK);
    return 1;
}

static duk_ret_t
dbStmtBindString(duk_context *ctx) {
    unsigned placeholderIdx = duk_require_uint(ctx, 0); // 1st. arg
    const char *value = !duk_is_null(ctx, 1) ?          // 2nd. arg
        duk_require_string(ctx, 1) : nullptr;
    sqlite3_stmt *stmt;
    pullInsertStmt(stmt, placeholderIdx);
    duk_push_boolean(ctx, sqlite3_bind_text(stmt, placeholderIdx + 1, value, -1,
                                            SQLITE_TRANSIENT) == SQLITE_OK);
    return 1;
}

#define getVal(dukPushFn, sqliteGetterFn) \
    int colIdx = duk_require_int(ctx, 0); \
    duk_push_this(ctx); \
    duk_get_prop_string(ctx, -1, KEY_STMT_PTR); \
    auto *stmt = static_cast<sqlite3_stmt*>(duk_get_pointer(ctx, -1)); \
    duk_get_prop_string(ctx, -2, KEY_ROW_COL_COUNT); \
    if (colIdx < duk_get_int(ctx, -1)) { \
        if (sqlite3_column_type(stmt, colIdx) != SQLITE_NULL) \
            dukPushFn(ctx, sqliteGetterFn(stmt, colIdx)); \
        else \
            duk_push_null(ctx); \
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

// == fs ====
// =============================================================================
static duk_ret_t
fsWrite(duk_context *ctx) {
    const char* path = duk_require_string(ctx, 0);
    const std::string contents = duk_require_string(ctx, 1);
    std::string err;
    if (myFsWrite(path, contents, err)) {
        duk_push_boolean(ctx, true);
        return 1;
    }
    return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
}

static duk_ret_t
fsRead(duk_context *ctx) {
    const char* path = duk_require_string(ctx, 0);
    std::string out;
    std::string err;
    if (myFsRead(path, out, err)) {
        duk_push_string(ctx, out.c_str());
        return 1;
    }
    return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
}

static duk_ret_t
fsReadDir(duk_context *ctx) {
    const char* dirPath = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    std::string err;
    if (myFsReadDir(dirPath, [](const char *entryName, bool isDir, void *myPtr) -> bool {
        if (strcmp(entryName, ".") == 0 || strcmp(entryName, "..") == 0) return true;
        auto ctx = static_cast<duk_context*>(myPtr);
        duk_dup(ctx, -1);                             // [dirPath fn fn]
        duk_push_object(ctx);                         // [dirPath fn fn obj]
        duk_push_string(ctx, entryName);              // [dirPath fn fn obj fname]
        duk_put_prop_string(ctx, -2, "name");         // [dirPath fn fn obj]
        duk_push_boolean(ctx, isDir);                 // [dirPath fn fn obj bool]
        duk_put_prop_string(ctx, -2, "isDir");        // [dirPath fn fn obj]
        if (duk_pcall(ctx, 1) == DUK_EXEC_SUCCESS) {  // [dirPath fn bool|none]
            bool doContinue = duk_get_boolean_default(ctx, -1, true);
            duk_pop(ctx);                             // [dirPath fn]
            return doContinue;
        }                                             // [dirPath fn err]
        return false;
    }, ctx, err)) {
        duk_push_boolean(ctx, true);
        return 1;
    }
    return duk_error(ctx, DUK_ERR_ERROR, "%s", !err.empty()
        ? err.c_str()
        : duk_safe_to_string(ctx, -1));
}

static duk_ret_t
fsMakeDirs(duk_context *ctx) {
    const char* path = duk_require_string(ctx, 0);
    std::string err;
    if (myFsMakeDirs(path, err)) {
        duk_push_boolean(ctx, true);
        return 1;
    }
    return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
}

// == transpiler ====
// =============================================================================
static duk_ret_t
transpilerTranspileToFn(duk_context *ctx) {
    char *js = duk_get_top(ctx) < 3 || duk_get_boolean_default(ctx, 2, true)
        ? transpilerTranspileDuk(duk_require_string(ctx, 0))
        : transpilerTranspile(duk_require_string(ctx, 0));
    const char *fileName = duk_require_string(ctx, 1);
    std::string err;
    if (js) {
        if (dukUtilsCompileStrToFn(ctx, js, fileName, err)) { // [... fn]
            return 1;
        }
        return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
    }
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, "%s", transpilerGetLastError());
}

// == Uploader ====
// =============================================================================
static duk_ret_t
uploaderConstruct(duk_context *ctx) {
    if (!duk_is_constructor_call(ctx)) return DUK_RET_TYPE_ERROR;
    auto *self = new CurlUploader{
        {nullptr, nullptr, 0},      // pendingUploadState
        nullptr,                    // curl
        duk_require_string(ctx, 0), // username
        duk_require_string(ctx, 1)  // password
    };
    std::string err;
    if (!self->init(err)) {
        return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
    }
    duk_push_this(ctx);                             // [this]
    duk_push_pointer(ctx, self);                    // [this ptr]
    duk_put_prop_string(ctx, -2, KEY_UPLOADER_PTR); // [this]
    duk_push_c_function(ctx, uploaderFinalize, 1);  // [this cfunc]
    duk_set_finalizer(ctx, -2);                     // [this]
	return 0;
}

static duk_ret_t
uploaderFinalize(duk_context *ctx) {
                                                   // [this]
    duk_get_prop_string(ctx, 0, KEY_UPLOADER_PTR); // [this ptr]
    delete static_cast<CurlUploader*>(duk_get_pointer(ctx, -1));
    return 0;
}

static duk_ret_t
uploaderUploadString(duk_context *ctx) {
    duk_push_this(ctx);                             // [remoteUrl contents this]
    duk_get_prop_string(ctx, -1, KEY_UPLOADER_PTR); // [remoteUrl contents this ptr]
    auto *self = static_cast<CurlUploader*>(duk_get_pointer(ctx, -1));
    int res = self->uploadFromMem(duk_require_string(ctx, 0), duk_require_string(ctx, 1));
    duk_push_uint(ctx, res);                        // [remoteUrl contents this ptr out]
    return 1;
}

static duk_ret_t
uploaderUploadFile(duk_context *ctx) {
    duk_push_this(ctx);                             // [remoteUrl localFilePath this]
    duk_get_prop_string(ctx, -1, KEY_UPLOADER_PTR); // [remoteUrl localFilePath this ptr]
    auto *self = static_cast<CurlUploader*>(duk_get_pointer(ctx, -1));
    int res = self->uploadFromDisk(duk_require_string(ctx, 0), duk_require_string(ctx, 1));
    duk_push_uint(ctx, res);                        // [remoteUrl localFilePath this ptr out]
    return 1;
}

static duk_ret_t
uploaderDelete(duk_context *ctx) {
    duk_push_this(ctx);                             // [serverUrl itemPath bool this]
    duk_get_prop_string(ctx, -1, KEY_UPLOADER_PTR); // [serverUrl itemPath bool this ptr]
    auto *self = static_cast<CurlUploader*>(duk_get_pointer(ctx, -1));
    int res = self->deleteItem(duk_require_string(ctx, 0),
        duk_require_string(ctx, 1), duk_to_boolean(ctx, 2));
    duk_push_uint(ctx, res);                        // [serverUrl itemPath bool this ptr out]
    return 1;
}

// == DomTree ====
// =============================================================================
static DomTree*
domTreeGetSelfPtr(duk_context *ctx, const int thisIsAt) {
    assert(thisIsAt < 0 && "...");
    duk_get_prop_string(ctx, thisIsAt, KEY_DOM_TREE_PTR);
    auto *out = static_cast<DomTree*>(duk_get_pointer(ctx, -1));
    duk_pop(ctx);
    return out;
}

static void
collectElemChildren(duk_context *ctx, int valueIsAt,
                    std::vector<unsigned> &children, DomTree &domTree) {
    duk_int_t type = duk_get_type(ctx, valueIsAt);
    /*
     * Single elemNode (..., e("child" ...)...)
     */
    if (type == DUK_TYPE_NUMBER) {
        children.push_back(duk_get_uint(ctx, valueIsAt));
    /*
     * Single textNode (..., "Text here"...)
     */
    } else if (type == DUK_TYPE_STRING) {
        children.push_back(domTree.createTextNode(duk_get_string(ctx, valueIsAt)));
    /*
     * Array of elem|TextNodes (..., [e("child"...)|"Text here"...]...)
     */
    } else if (duk_is_array(ctx, valueIsAt)) {
        unsigned l = duk_get_length(ctx, valueIsAt);
        if (l > 0) {
            for (unsigned i = 0; i < l; ++i) {
                duk_get_prop_index(ctx, valueIsAt, i);
                collectElemChildren(ctx, -1, children, domTree);
                duk_pop(ctx);
            }
        } else {
            std::cerr << "[Debug]: got an empty vElem child-array, pushing an "
                          "empty string.\n";
            children.push_back(domTree.createTextNode(""));
        }
    } else {
        if (!duk_is_null_or_undefined(ctx, valueIsAt)) {
            std::cerr << "[Debug]: vElem content wasn't \"str\", <nodeRef> nor "
                         "[<nodeRef>...]: attempting toString().\n";
        }
        children.push_back(domTree.createTextNode(duk_to_string(ctx, valueIsAt)));
    }
}

static void
collectElemProps(duk_context *ctx, std::vector<ElemProp> &to) {
    duk_enum(ctx, 1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [str props children this enum]
    while (duk_next(ctx, -1, true)) {               // [str props children this enum key val]
        to.emplace_back(duk_to_string(ctx, -2), duk_to_string(ctx, -1));
        duk_pop_2(ctx);                             // [str props children this enum]
    }
    duk_pop(ctx);                                   // [str props children this]
}

static duk_ret_t
domTreeConstruct(duk_context *ctx) {
    if (!duk_is_constructor_call(ctx)) return DUK_RET_TYPE_ERROR;
    duk_push_this(ctx);                             // [this]
    duk_push_pointer(ctx, new DomTree);             // [this ptr]
    duk_put_prop_string(ctx, -2, KEY_DOM_TREE_PTR); // [this]
    duk_push_c_function(ctx, domTreeFinalize, 1);   // [this cfunc]
    duk_set_finalizer(ctx, -2);                     // [this]
    duk_push_bare_object(ctx);                      // [this obj]
    duk_put_prop_string(ctx, -2, KEY_CMP_FUNCS);    // [this]
	return 0;
}

static duk_ret_t
domTreeFinalize(duk_context *ctx) {
                                                   // [this]
    duk_get_prop_string(ctx, 0, KEY_DOM_TREE_PTR); // [this ptr]
    delete static_cast<DomTree*>(duk_get_pointer(ctx, -1));
    return 0;
}

static duk_ret_t
domTreeCreateElement(duk_context *ctx) {
    if (duk_get_top(ctx) != 3) return duk_error(ctx, DUK_ERR_TYPE_ERROR,
        "createElement expects exactly 3 arguments");
    #define createElem(props) \
        auto *domTree = domTreeGetSelfPtr(ctx, -1); \
        std::vector<unsigned> children; \
        collectElemChildren(ctx, 2, children, *domTree); \
        duk_push_uint(ctx, domTree->createElemNode(tagName, props, &children))
    //
    duk_push_this(ctx);
    if (duk_is_string(ctx, 0)) {
        const char *tagName = duk_require_string(ctx, 0);
        if (duk_is_object_coercible(ctx, 1))  {
            std::vector<ElemProp> props;
            collectElemProps(ctx, props);
            createElem(&props);
        } else {
            createElem(nullptr);
        }
    } else if (duk_is_function(ctx, 0)) {
        auto *domTree = domTreeGetSelfPtr(ctx, -1);
        unsigned ref = domTree->createFuncNode(domTreeCallCmpFn, ctx);
        // Does this.fnMap[newIndex] = {fn: fnArg, props: propsArg}
        duk_get_prop_string(ctx, -1, KEY_CMP_FUNCS);   // [fn ... this fnMap]
        duk_push_bare_object(ctx);                     // [fn ... this fnMap fnData]
        duk_dup(ctx, 0);                               // [fn ... this fnMap fnData fn]
        duk_put_prop_string(ctx, -2, "fn");            // [fn ... this fnMap fnData]
        duk_dup(ctx, 1);                               // [fn ... this fnMap fnData props]
        duk_put_prop_string(ctx, -2, "props");         // [fn ... this fnMap fnData]
        duk_put_prop_index(ctx, -2, domTree->funcNodes.size()); // [fn ... this fnMap]
        duk_push_uint(ctx, ref);                       // [fn ... this fnMap elemRef]
    } else {
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, "#1 arg of createElement must"
                         " be a string or function");
    }
    return 1;
}

static duk_ret_t
domTreeRender(duk_context *ctx) {
    unsigned ref = duk_require_uint(ctx, 0);
    // Setup stack for domTreeCallCmpFn() (called by render())
    duk_push_this(ctx);                          // [... this]
    duk_get_prop_string(ctx, -1, KEY_CMP_FUNCS); // [... this fnMap]
    duk_push_null(ctx);                          // [... this fnMap null]
    auto *domTree = domTreeGetSelfPtr(ctx, -3);
    ElemNode *el = nullptr;
    if (DomTree::getNodeType(ref) != NODE_TYPE_ELEM ||
        !(el = domTree->getElemNode(ref))) return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                                                    "Invalid rootNodeRef.", ref);
    domTree->rootElemIndex = el->id - 1;
    std::string err;
    std::string *html = domTree->render(err);
    if (html) {
        duk_push_string(ctx, html->c_str());
        return 1;
    }
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, err.c_str());
}

static bool
buildElemArray(DomTree *self, NodeType type, unsigned nodeId, void *myPtr) {
                                                              // [? out]
    if (type == NODE_TYPE_ELEM) {
        auto *ctx = static_cast<duk_context*>(myPtr);
        duk_push_object(ctx);                                 // [? out el]
        ElemNode *el = &self->elemNodes[nodeId - 1];
        duk_push_string(ctx, el->tagName.c_str());            // [? out el str]
        duk_put_prop_string(ctx, -2, "tagName");              // [? out el]
        if (!el->properties.empty()) {
            duk_push_object(ctx);                             // [? out el props]
            for (const ElemProp &prop: el->properties) {
                duk_push_string(ctx, prop.second.c_str());    // [? out el props val]
                duk_put_prop_string(ctx, -2, prop.first.c_str());
            }
            duk_put_prop_string(ctx, -2, "props");            // [? out el]
        } else {
            duk_push_bare_object(ctx);                        // [? out el null]
            duk_put_prop_string(ctx, -2, "props");            // [? out el]
        }
        duk_put_prop_index(ctx, -2, duk_get_length(ctx, -2)); // [? out]
    }
                                                              // [? out]
    return true;
}

static duk_ret_t
domTreeGetRenderedElems(duk_context *ctx) {
    duk_push_this(ctx);                          // [this]
    duk_get_prop_string(ctx, -1, KEY_CMP_FUNCS); // [this fnMap]
    duk_push_array(ctx);                         // [this fnMap out]
    auto *domTree = domTreeGetSelfPtr(ctx, -3);
    std::string err;
    if (domTree->rootElemIndex < 0) domTree->rootElemIndex = domTree->elemNodes.size() - 1;
    if (domTree->traverse(buildElemArray, ctx, err)) return 1;
    return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
}

static duk_ret_t
domTreeGetRenderedFnComponents(duk_context *ctx) {
    duk_push_this(ctx);                          // [this]
    duk_get_prop_string(ctx, -1, KEY_CMP_FUNCS); // [this fnMap]
    duk_push_array(ctx);                         // [this fnMap out]
    auto *domTree = domTreeGetSelfPtr(ctx, -3);
    std::string err;
    if (domTree->rootElemIndex < 0) domTree->rootElemIndex = domTree->elemNodes.size() - 1;
    if (domTree->traverse([](DomTree *self, NodeType type, unsigned nodeId, void *myPtr) -> bool {
        if (type == NODE_TYPE_FUNC) {
            duk_context *ctx = static_cast<duk_context*>(myPtr);
            duk_get_prop_index(ctx, -2, nodeId); // [this fnMap out funcData]
            assert(!duk_is_null_or_undefined(ctx, -1) && "A component function has vanished!!");
            duk_put_prop_index(ctx, -2, duk_get_length(ctx, -2)); // [this fnMap out]
        }
        return true;
    }, ctx, err)) {
        return 1;
    }
    return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
}

static unsigned
domTreeCallCmpFn(FuncNode *me, std::string &err) {
    // If we're coming from render() ->          // [? this fnMap null]
    // If we're coming from getRendered*() ->    // [? this fnMap arr]
    auto *ctx = static_cast<duk_context*>(me->myPtr);
    duk_get_prop_index(ctx, -2, me->id);         // [? this fnMap _ funcData]
    assert(!duk_is_null_or_undefined(ctx, -1) && "A component function has vanished!!");
    duk_get_prop_string(ctx, -1, "fn");          // [? this fnMap _ funcData fn]
    duk_dup(ctx, -5);                            // [? this fnMap _ funcData fn this]
    duk_get_prop_string(ctx, -3, "props");       // [? this fnMap _ funcData fn this props]
    if (duk_is_null_or_undefined(ctx, -1)) {
        duk_pop(ctx);
        duk_push_bare_object(ctx);
    }
    if (duk_pcall(ctx, 2) == DUK_EXEC_SUCCESS) { // [? this fnMap _ funcData elemRef]
        if (duk_is_number(ctx, -1)) {
            unsigned out = duk_get_number(ctx, -1);
            duk_pop_2(ctx);                      // [? this fnMap _]
            return out;
        } else {
            err = "A component function must return domTree.createElement(...).";
            return 0;
        }
    }                                            // [? this fnMap _ funcData err]
    err = duk_safe_to_string(ctx, -1);
    duk_pop_2(ctx);                              // [? this fnMap _]
    return 0;
}

// == fwatcher ====
// =============================================================================
void
commonServicesCallJsFWFn(FWEventType type, const char *fileName,
                         const char *ext, void *myPtr) {
    auto *appCtx = static_cast<AppEnv*>(myPtr);
    duk_context *ctx = appCtx->dukCtx;
    jsEnvironmentPushCommonService(ctx, "fileWatcher"); // [fw]
    if (duk_get_prop_string(ctx, -1, "_watchFn")) {  // [fw fn]
        duk_push_uint(ctx, type);                    // [fw fn arg1(type)]
        duk_push_string(ctx, fileName);              // [fw fn arg1(type) arg2(fileName)]
        duk_push_string(ctx, ext);                   // [fw fn arg1(type) arg2(fileName) arg3(fileExt)]
        if (duk_pcall(ctx, 3) != DUK_EXEC_SUCCESS) { // [fw err|undef]
            dukUtilsPutDetailedError(ctx, -1, "fwFatchFn", appCtx->errBuf); // [fw]
            duk_push_error_object(ctx, DUK_ERR_ERROR, "%s", appCtx->errBuf);
            std::cerr << appCtx->errBuf << "\n";
            appCtx->errBuf.clear();
        }
    }                                                // [fw undef]
    duk_pop_2(ctx);                                  // []
}
