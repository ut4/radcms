#include "../../include/common-services-js-bindings.hpp"

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
static duk_ret_t fsMakeDirs(duk_context *ctx);
static duk_ret_t transpilerTranspileToFn(duk_context *ctx);
static duk_ret_t domTreeConstruct(duk_context *ctx);
static duk_ret_t domTreeFree(duk_context *ctx);
static duk_ret_t domTreeCreateElement(duk_context *ctx);
static duk_ret_t domTreeRender(duk_context *ctx);
static duk_ret_t domTreeGetRenderedFnComponents(duk_context *ctx);
static unsigned domTreeCallCmpFn(FuncNode *me, std::string &err);

constexpr const char* KEY_STMT_JS_PROTO = "_StmtProto";
constexpr const char* KEY_RES_ROW_JS_PROTO = "_ResRowProto";
constexpr const char* KEY_CUR_ROW_MAP_FN = "_currentRowMapFn";
constexpr const char* KEY_ROW_COL_COUNT = DUK_HIDDEN_SYMBOL("_colCount");
constexpr const char* KEY_STMT_PTR = DUK_HIDDEN_SYMBOL("_sqliteStmtPtr");
constexpr const char* KEY_STMT_MAX_BIND_IDX = DUK_HIDDEN_SYMBOL("_maxPlaceholderIdx");
constexpr const char* KEY_DOM_TREE_PTR = DUK_HIDDEN_SYMBOL("_domTreePtr");
constexpr const char* KEY_CMP_FUNCS = DUK_HIDDEN_SYMBOL("_domTreeCmpFuncs");

void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    // module.db
    duk_get_prop_string(ctx, exportsIsAt, "db");        // [? db]
    duk_push_c_lightfunc(ctx, dbInsert, 2, 0, 0);       // [? db lightfn]
    duk_put_prop_string(ctx, -2, "insert");             // [? db]
    duk_push_c_lightfunc(ctx, dbSelect, 2, 0, 0);       // [? db lightfn]
    duk_put_prop_string(ctx, -2, "select");             // [? db]
    duk_push_c_lightfunc(ctx, dbUpdate, 2, 0, 0);       // [? db lightfn]
    duk_put_prop_string(ctx, -2, "update");             // [? db]
    duk_get_prop_string(ctx, -1, "update");             // [? db lightfn]
    duk_put_prop_string(ctx, -2, "delete");             // [? db]
    duk_pop(ctx);                                       // [?]
    // module.fs
    duk_get_prop_string(ctx, exportsIsAt, "fs");        // [? fs]
    duk_push_c_lightfunc(ctx, fsWrite, 2, 0, 0);        // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "write");              // [? fs]
    duk_push_c_lightfunc(ctx, fsRead, 1, 0, 0);         // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "read");               // [? fs]
    duk_push_c_lightfunc(ctx, fsMakeDirs, 1, 0, 0);     // [? fs lightfn]
    duk_put_prop_string(ctx, -2, "makeDirs");           // [? fs]
    duk_pop(ctx);                                       // [?]
    // module.transpiler
    duk_get_prop_string(ctx, exportsIsAt, "transpiler");// [? transpiler]
    duk_push_c_lightfunc(ctx, transpilerTranspileToFn, 1, 0, 0); // [? transpiler lightfn]
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
    // module.DomTree
    duk_push_c_function(ctx, domTreeConstruct, 1);     // [? DomTree]
    duk_push_bare_object(ctx);                         // [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeCreateElement, DUK_VARARGS, 0, 0); // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "createElement");      // [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeRender, 1, 0, 0);  // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "render");             // [? DomTree proto]
    duk_push_c_lightfunc(ctx, domTreeGetRenderedFnComponents, 0, 0, 0); // [? DomTree proto lightfn]
    duk_put_prop_string(ctx, -2, "getRenderedFnComponents"); // [? DomTree proto]
    duk_put_prop_string(ctx, -2, "prototype");          // [? DomTree]
    duk_put_prop_string(ctx, exportsIsAt, "DomTree");   // [?]
}

static bool
callJsStmtBindFn(sqlite3_stmt *stmt, void *myPtr) {
                                                      // [sql stash fn]
    auto *ctx = static_cast<duk_context*>(myPtr);
    // Push new Stmt();
    duk_push_bare_object(ctx);                        // [sql stash fn stmt]
    duk_push_pointer(ctx, stmt);                      // [sql stash fn stmt ptr]
    duk_put_prop_string(ctx, -2, KEY_STMT_PTR);       // [sql stash fn stmt]
    duk_push_int(ctx, sqlite3_bind_parameter_count(stmt) - 1);// [sql stash fn stmt int]
    duk_put_prop_string(ctx, -2, KEY_STMT_MAX_BIND_IDX);// [sql stash fn stmt]
    duk_get_prop_string(ctx, -3, KEY_STMT_JS_PROTO);  // [sql stash fn stmt proto]
    duk_set_prototype(ctx, -2);                       // [sql stash fn stmt]
    // call bindFn(stmt)
    bool ok = duk_pcall(ctx, 1) == DUK_EXEC_SUCCESS;  // [sql stash undefined|err]
    if (ok) { duk_pop(ctx); }                         // [sql stash]
    return ok;                                        // [sql stash err?]
}

static duk_ret_t
dbInsertOrUpdate(duk_context *ctx, bool isInsert) {
    const char *sql = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    duk_push_global_stash(ctx);                  // [sql fn stash]
    AppContext* app = jsEnvironmentPullAppContext(ctx, -1);
    duk_swap_top(ctx, -2);                       // [sql stash fn]
    std::string err;
    int res = isInsert
        ? app->db->insert(sql, callJsStmtBindFn, ctx, err)
        : app->db->update(sql, callJsStmtBindFn, ctx, err);
    if (res > -1) {                              // [sql stash]
        duk_push_int(ctx, res);                  // [sql stash insertId]
        return 1;
    }                                            // [sql stash err]
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
                                                      // [sql stash]
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_get_prop_string(ctx, -1, KEY_CUR_ROW_MAP_FN); // [sql stash fn]
    // Push new ResultRow();
    duk_push_bare_object(ctx);                        // [sql stash fn row]
    duk_push_int(ctx, sqlite3_column_count(stmt));    // [sql stash fn row int]
    duk_put_prop_string(ctx, -2, KEY_ROW_COL_COUNT);  // [sql stash fn row]
    duk_push_pointer(ctx, stmt);                      // [sql stash fn row ptr]
    duk_put_prop_string(ctx, -2, KEY_STMT_PTR);       // [sql stash fn row]
    duk_get_prop_string(ctx, -3, KEY_RES_ROW_JS_PROTO);// [sql stash fn row proto]
    duk_set_prototype(ctx, -2);                       // [sql stash fn row]
    duk_push_uint(ctx, rowIdx);                       // [sql stash fn row int]
    // call mapFn(row)
    bool ok = duk_pcall(ctx, 2) == DUK_EXEC_SUCCESS;  // [sql stash undefined|err]
    if (ok) { duk_pop(ctx); }                         // [sql stash]
    return ok;                                        // [sql stash err?]
}

static duk_ret_t
dbSelect(duk_context *ctx) {
    const char *sql = duk_require_string(ctx, 0);
    duk_require_function(ctx, 1);
    duk_push_global_stash(ctx);                 // [sql fn stash]
    AppContext *app = jsEnvironmentPullAppContext(ctx, -1);
    duk_swap_top(ctx, -2);                      // [sql stash fn]
    duk_put_prop_string(ctx, -2, KEY_CUR_ROW_MAP_FN); // [sql stash]
    std::string err;
    bool res = app->db->select(sql, callJsResultRowMapFn, ctx, err);
    duk_push_null(ctx);
    duk_put_prop_string(ctx, 1, KEY_CUR_ROW_MAP_FN);
    if (res) {                                  // [sql stash]
        duk_push_boolean(ctx, true);            // [sql stash bool]
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
    char *js = transpilerTranspile(duk_require_string(ctx, 0));
    std::string err;
    if (js) {
        if (dukUtilsCompileStrToFn(ctx, js, "source", err)) { // [stash fn]
            return 1;
        }
        return duk_error(ctx, DUK_ERR_ERROR, "%s", err.c_str());
    }
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, "%s", transpilerGetLastError());
}

// == DomTree ====
// =============================================================================
static DomTree*
domTreeGetSelfPtr(duk_context *ctx) {
    duk_push_this(ctx);
    duk_get_prop_string(ctx, -1, KEY_DOM_TREE_PTR);
    auto *out = static_cast<DomTree*>(duk_get_pointer(ctx, -1));
    duk_pop_2(ctx);
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
            std::cerr << "[Notice]: got an empty vElem child-array, pushing an "
                          "empty string.\n";
            children.push_back(domTree.createTextNode(""));
        }
    } else {
        std::cerr << "[Warn]: vElem content wasn't \"str\", <nodeRef> nor "
                      "[<nodeRef>...]: attempting toString().\n";
        children.push_back(domTree.createTextNode(duk_to_string(ctx, valueIsAt)));
    }
}

static void
collectElemProps(duk_context *ctx, std::vector<ElemProp> &to) {
    duk_enum(ctx, 1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [str props children dtree enum]
    while (duk_next(ctx, -1, true)) {               // [str props children dtree enum key val]
        to.emplace_back(duk_to_string(ctx, -2), duk_to_string(ctx, -1));
        duk_pop_2(ctx);                             // [str props children enum]
    }
    duk_pop(ctx);                                   // [str props children]
}

static duk_ret_t
domTreeConstruct(duk_context *ctx) {
    if (!duk_is_constructor_call(ctx)) return DUK_RET_TYPE_ERROR;
    duk_push_this(ctx);                             // [this]
    duk_push_pointer(ctx, new DomTree);             // [this ptr]
    duk_put_prop_string(ctx, -2, KEY_DOM_TREE_PTR); // [this]
    duk_push_c_function(ctx, domTreeFree, 1);       // [this cfunc]
    duk_set_finalizer(ctx, -2);                     // [this]
    duk_push_bare_object(ctx);                      // [this obj]
    duk_put_prop_string(ctx, -2, KEY_CMP_FUNCS);    // [this]
	return 0;
}

static duk_ret_t
domTreeFree(duk_context *ctx) {
    duk_get_prop_string(ctx, 0, KEY_DOM_TREE_PTR); // [ptr]
    free(duk_get_pointer(ctx, -1));
    return 0;
}

static duk_ret_t
domTreeCreateElement(duk_context *ctx) {
    if (duk_get_top(ctx) != 3) return duk_error(ctx, DUK_ERR_TYPE_ERROR,
        "createElement expects exactly 3 arguments");
    #define createElem(props) \
        auto *domTree = domTreeGetSelfPtr(ctx); \
        std::vector<unsigned> children; \
        collectElemChildren(ctx, 2, children, *domTree); \
        duk_push_uint(ctx, domTree->createElemNode(tagName, props, &children))
    //
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
        auto *domTree = domTreeGetSelfPtr(ctx);
        unsigned ref = domTree->createFuncNode(domTreeCallCmpFn, ctx);
        // Does this.fnMap[newIndex] = {fn: fnArg, props: propsArg}
        duk_push_this(ctx);                            // [fn ... this]
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
    auto *domTree = domTreeGetSelfPtr(ctx);
    ElemNode *el = nullptr;
    if (DomTree::getNodeType(ref) != NODE_TYPE_ELEM ||
        !(el = domTree->getElemNode(ref))) return duk_error(ctx, DUK_ERR_TYPE_ERROR,
                                                    "Invalid rootNodeRef.", ref);
    domTree->rootElemIndex = el->id - 1;
    duk_push_this(ctx);         // [this]
    std::string err;
    std::string *html = domTree->render(err);
    if (html) {
        duk_push_string(ctx, html->c_str());
        return 1;
    }
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, err.c_str());
}

static duk_ret_t
domTreeGetRenderedFnComponents(duk_context *ctx) {
    duk_push_this(ctx);                          // [this]
    duk_get_prop_string(ctx, -1, KEY_CMP_FUNCS); // [this fnMap]
    duk_push_array(ctx);                         // [this fnMap out]
    auto *domTree = domTreeGetSelfPtr(ctx);
    std::string err;
    if (domTree->traverse([](NodeType type, unsigned nodeId, void *myPtr) -> bool {
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
                                                 // [ref domTree]
    auto *ctx = static_cast<duk_context*>(me->myPtr);
    duk_get_prop_string(ctx, -1, KEY_CMP_FUNCS); // [ref domTree fnMap]
    duk_get_prop_index(ctx, -1, me->id);         // [ref domTree fnMap funcData]
    assert(!duk_is_null_or_undefined(ctx, -1) && "A component function has vanished!!");
    duk_get_prop_string(ctx, -1, "fn");          // [ref domTree fnMap funcData fn]
    duk_dup(ctx, -4);                            // [ref domTree fnMap funcData fn domTree]
    duk_get_prop_string(ctx, -3, "props");       // [ref domTree fnMap funcData fn domTree props]
    if (duk_pcall(ctx, 2) == DUK_EXEC_SUCCESS) { // [ref domTree fnMap funcData elemRef]
        if (duk_is_number(ctx, -1)) {
            unsigned out = duk_get_number(ctx, -1);
            duk_pop_3(ctx);                      // [ref domTree]
            return out;
        } else {
            err = "A component function must return domTree.createElement(...).";
            return 0;
        }
    }                                            // [ref domTree fnMap funcData err]
    err = duk_safe_to_string(ctx, -1);
    duk_pop_3(ctx);                              // [ref domTree]
    return 0;
}
