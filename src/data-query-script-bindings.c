#include "../include/data-query-script-bindings.h"

#define KEY_DDC_C_PTR "_documentDataConfigCPtr"
#define KEY_DBC_C_PTR "_dataBatchConfigCPtr"
#define KEY_DBC_JS_PROTO "_DataBatchConfigJsPrototype"

/** Implements global.documentDataConfig.fetchOne($componentTypeName) */
static duk_ret_t
documentDataConfigSBFetchOne(duk_context *ctx);

/** Implements global.documentDataConfig.fetchAll($componentTypeName) */
static duk_ret_t
documentDataConfigSBFetchAll(duk_context *ctx);

/** Implements $dataBatchConfig.where($sql) */
static duk_ret_t
dataBatchConfigSBSetWhere(duk_context *ctx);

/** Implements $dataBatchConfig.to($varName) */
static duk_ret_t
dataBatchConfigSBSetTmplVarName(duk_context *ctx);

/** Implements $dataBatchConfig._validate() */
static duk_ret_t
dataBatchConfigSBValidate(duk_context *ctx);

void
dataQueryScriptBindingsInit(duk_context *ctx) {
    /*
     * global.documentDataConfig object
     */
    duk_push_bare_object(ctx);                        // [... obj]
    duk_push_c_lightfunc(ctx, documentDataConfigSBFetchOne, 1, 1, 0); // [... obj lightfn]
    duk_put_prop_string(ctx, -2, "fetchOne");        // [... obj]
    duk_push_c_lightfunc(ctx, documentDataConfigSBFetchAll, 1, 1, 0); // [... obj lightfn]
    duk_put_prop_string(ctx, -2, "fetchAll");        // [... obj]
    duk_put_global_string(ctx, "documentDataConfig"); // [...]
    /*
     * stashed DataBatchConfig object prototype
     */
    duk_push_thread_stash(ctx, ctx);                        // [... stash]
    duk_push_bare_object(ctx);                              // [... stash obj]
    duk_push_c_lightfunc(ctx, dataBatchConfigSBSetWhere, 1, 1, 0); // [... stash obj lightfn]
    duk_put_prop_string(ctx, -2, "where");                  // [... stash obj]
    duk_push_c_lightfunc(ctx, dataBatchConfigSBSetTmplVarName, 1, 1, 0); // [... stash obj lightfn]
    duk_put_prop_string(ctx, -2, "to");                     // [... stash obj]
    duk_push_c_lightfunc(ctx, dataBatchConfigSBValidate, 1, 1, 0); // [... stash obj lightfn]
    duk_put_prop_string(ctx, -2, "_validate");              // [... stash obj]
    duk_put_prop_string(ctx, -2, KEY_DBC_JS_PROTO);         // [... stash]
    duk_pop(ctx);                                           // [...]
}

void
dataQuerySBSetStashedDocumentDataConfig(duk_context *ctx, DocumentDataConfig *ddc) {
    duk_push_thread_stash(ctx, ctx);             // [... stash]
    duk_push_pointer(ctx, ddc);                  // [... stash ptr]
    duk_put_prop_string(ctx, -2, KEY_DDC_C_PTR); // [... stash]
    duk_pop(ctx);                                // [...]
}

static void
dataQuerySBPushDbc(duk_context *ctx, DataBatchConfig *dbc) {
    duk_push_object(ctx);                        // [... obj]
    duk_push_uint(ctx, dbc->id);                 // [... obj, uint]
    duk_put_prop_string(ctx, -2, "id");          // [... obj]
    duk_push_thread_stash(ctx, ctx);             // [... obj stash]
    // set obj.prototype = stash.dbcPrototypeObject
    duk_get_prop_string(ctx, -1, KEY_DBC_JS_PROTO);// [... obj stash proto]
    duk_set_prototype(ctx, -3);                  // [... obj stash]
    // set stash.currentDbcPtr = dbc
    duk_push_pointer(ctx, dbc);                  // [... stash ptr]
    duk_put_prop_string(ctx, -2, KEY_DBC_C_PTR); // [... stash]
    duk_pop(ctx);                                // [... obj]
}

static duk_ret_t
handleFetchOneOrFetchAll(duk_context *ctx, bool isFetchAll) {
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, KEY_DDC_C_PTR);
    DocumentDataConfig *ddc = duk_get_pointer(ctx, -1);
    const char *componentTypeName = duk_require_string(ctx, 0); // 1. arg
    DataBatchConfig *dbc = documentDataConfigAddBatch(ddc, componentTypeName,
                                                      isFetchAll);
    if (strlen(componentTypeName) > DBC_MAX_CMP_TYPE_NAME_LEN) {
        setFlag(dbc->errors, DBC_CMP_TYPE_NAME_TOO_LONG);
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, "Component type name too long"
            " (max %u, was %lu).\n", DBC_MAX_CMP_TYPE_NAME_LEN,
            strlen(componentTypeName));
    }
    dataQuerySBPushDbc(ctx, dbc);
    return 1;
}

static duk_ret_t
documentDataConfigSBFetchOne(duk_context *ctx) {
    return handleFetchOneOrFetchAll(ctx, false);
}

static duk_ret_t
documentDataConfigSBFetchAll(duk_context *ctx) {
    return handleFetchOneOrFetchAll(ctx, true);
}

static duk_ret_t
dataBatchConfigSBSetWhere(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, KEY_DBC_C_PTR);
    DataBatchConfig *dbc = duk_get_pointer(ctx, -1);
    const char *where = duk_require_string(ctx, 0); // 1. arg
    if (strlen(where) > DBC_MAX_WHERE_LEN) {
        setFlag(dbc->errors, DBC_WHERE_TOO_LONG);
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, "where() too long (max %u, "
            "was %lu).\n", DBC_MAX_WHERE_LEN, strlen(where));
    }
    dataBatchConfigSetWhere(dbc, where);
    duk_push_this(ctx);
    return 1;
}

static duk_ret_t
dataBatchConfigSBSetTmplVarName(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, KEY_DBC_C_PTR);
    DataBatchConfig *dbc = duk_get_pointer(ctx, -1);
    const char *varName = duk_require_string(ctx, 0); // 1. arg
    if (strlen(varName) > DBC_MAX_TMPL_VAR_NAME_LEN) {
        setFlag(dbc->errors, DBC_TMPL_VAR_NAME_TOO_LONG);
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, "to() variable name too long"
            " (max %u, was %lu).\n", DBC_MAX_TMPL_VAR_NAME_LEN, strlen(varName));
    }
    dataBatchConfigSetTmplVarName(dbc, varName);
    duk_push_this(ctx);
    return 1;
}

static duk_ret_t
dataBatchConfigSBValidate(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, KEY_DDC_C_PTR);
    DataBatchConfig *cur = &((DocumentDataConfig*)duk_get_pointer(ctx, -1))->batches;
    while (cur) {
        if (!cur->isFetchAll && !cur->where) {
            setFlag(cur->errors, DBC_WHERE_REQUIRED);
            return duk_error(ctx, DUK_ERR_TYPE_ERROR, "fetchOne().where() is required.\n");
        }
        cur = cur->next;
    }
    duk_push_this(ctx);
    return 1;
}
