#include "../../include/common-services-js-bindings.hpp"

static duk_ret_t dbInsert(duk_context *ctx);
static duk_ret_t dbSelect(duk_context *ctx);
static duk_ret_t dbStmtBindInt(duk_context *ctx);
static duk_ret_t dbStmtBindString(duk_context *ctx);
static duk_ret_t dbResRowGetInt(duk_context *ctx);
static duk_ret_t dbResRowGetString(duk_context *ctx);
static duk_ret_t domTreeConstruct(duk_context *ctx);
static duk_ret_t domTreeFree(duk_context *ctx);
static duk_ret_t domTreeCreateElement(duk_context *ctx);
static duk_ret_t domTreeRender(duk_context *ctx);

constexpr const char* KEY_STMT_JS_PROTO = "_StmtProto";
constexpr const char* KEY_RES_ROW_JS_PROTO = "_ResRowProto";
constexpr const char* KEY_CUR_ROW_COL_COUNT = "_curResultRowColCount";
constexpr const char* KEY_CUR_STMT_PTR = "_curSqliteStmtPtr";
constexpr const char* KEY_CUR_STMT_MAX_BIND_IDX = DUK_HIDDEN_SYMBOL("_curStmtMaxPlaceholderIdx");
constexpr const char* KEY_DOM_TREE_PTR = DUK_HIDDEN_SYMBOL("_domTreePtr");

void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    // module.db
    duk_get_prop_string(ctx, exportsIsAt, "db");        // [? db]
    duk_push_c_lightfunc(ctx, dbInsert, 2, 0, 0);       // [? db lightfn]
    duk_put_prop_string(ctx, -2, "insert");             // [? db]
    duk_push_c_lightfunc(ctx, dbSelect, 2, 0, 0);       // [? db lightfn]
    duk_put_prop_string(ctx, -2, "select");             // [? db]
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
    duk_put_prop_string(ctx, -2, "prototype");          // [? DomTree]
    duk_put_prop_string(ctx, exportsIsAt, "DomTree");   // [?]
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
dbSelect(duk_context *ctx) {
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

// == DomTree ====
// =============================================================================
static DomTree*
domTreePushSelf(duk_context *ctx) {
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
    duk_enum(ctx, 1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [str props children enum]
    while (duk_next(ctx, -1, true)) {               // [str props children enum key val]
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
        auto *domTree = domTreePushSelf(ctx); \
        std::vector<unsigned> children; \
        collectElemChildren(ctx, 2, children, *domTree); \
        duk_push_uint(ctx, domTree->createElemNode(tagName, props, &children))
    //
    const char *tagName = duk_require_string(ctx, 0);
    if (duk_is_object_coercible(ctx, 1))  {
        std::vector<ElemProp> props;
        collectElemProps(ctx, props);
        createElem(&props);
    } else {
        createElem(nullptr);
    }
    return 1;
}

static duk_ret_t
domTreeRender(duk_context *ctx) {
    unsigned ref = duk_require_uint(ctx, 0);          // Arg #1
    auto *domTree = domTreePushSelf(ctx);             // [elemRef]
    ElemNode *el = domTree->getElemNode(ref);
    if (!el) return duk_error(ctx, DUK_ERR_TYPE_ERROR, "Invalid node ref.", ref);
    domTree->rootElemIndex = el->id - 1;
    duk_push_global_stash(ctx);
    std::string &errBuf = jsEnvironmentPullAppContext(ctx, -1)->errBuf;
    std::string *html = domTree->render(errBuf);
    if (html) {
        duk_push_string(ctx, html->c_str());
        return 1;
    }
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, errBuf.c_str());
}
