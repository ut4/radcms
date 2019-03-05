#include "../../include/app-js-bindings.hpp"

static duk_ret_t appFillDbIfEmpty(duk_context *ctx);

void
appJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    duk_get_prop_string(ctx, exportsIsAt, "app");   // [? app]
    duk_push_c_lightfunc(ctx, appFillDbIfEmpty, 0, 0, 0); // [? app lightfn]
    duk_put_prop_string(ctx, -2, "populateDatabaseIfEmpty"); // [? app]
    duk_pop(ctx);                                   // [?]
}

static duk_ret_t
appFillDbIfEmpty(duk_context *ctx) {
    duk_push_this(ctx);
    duk_get_prop_string(ctx, -1, "db");
    Db* self = commonServicesGetDbSelfPtr(ctx, -1);
    // Check if $appPath/data.db is already populated
    bool wasAlreadyPopulated = false;
    std::string err;
    self->select("select count(`type`) from sqlite_master",
        [](sqlite3_stmt *stmt, void *myPtr, unsigned _) {
            *((bool*)myPtr) = sqlite3_column_int(stmt, 0) > 0;
            return true;
        }, nullptr, &wasAlreadyPopulated, err);
    // Wasn't, populate
    if (!wasAlreadyPopulated) {
        if (!self->runInTransaction(getDbSchemaSql(false), err))
            return duk_error(ctx, DUK_ERR_ERROR, err.c_str());
    }
    // self-destruct
    duk_push_null(ctx);                                      // [this db null]
    duk_put_prop_string(ctx, -3, "populateDatabaseIfEmpty"); // [this db]
    return 0;
}
