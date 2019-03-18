#include "../../include/app-js-bindings.hpp"

static duk_ret_t appFillDbIfEmpty(duk_context *ctx);
static duk_ret_t appGetSampleContentTypes(duk_context *ctx);

void
appJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    duk_get_prop_string(ctx, exportsIsAt, "app");            // [? app]
    duk_push_c_lightfunc(ctx, appFillDbIfEmpty, 0, 0, 0);    // [? app lightfn]
    duk_put_prop_string(ctx, -2, "populateDatabaseIfEmpty"); // [? app]
    duk_push_c_lightfunc(ctx, appGetSampleContentTypes, 0, 0, 0); // [? app lightfn]
    duk_put_prop_string(ctx, -2, "getSampleContentTypes");   // [? app]
    duk_pop(ctx);                                            // [?]
}

static duk_ret_t
appFillDbIfEmpty(duk_context *ctx) {
    duk_push_this(ctx);
    duk_get_prop_string(ctx, -1, "db");
    Db* self = commonServicesGetDbSelfPtr(ctx, -1);
    // Check if $appPath+'data.db' is already populated
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

static duk_ret_t
appGetSampleContentTypes(duk_context *ctx) {
    auto &sampleData = getSampleData();
    duk_idx_t i = 0;
    duk_push_array(ctx);                                  // [arr]
    for (const auto &entry: sampleData) {
        duk_push_object(ctx);                             // [arr entry]
        duk_push_string(ctx, entry.name.c_str());         // [arr entry name]
        duk_put_prop_string(ctx, -2, "name");             // [arr entry]
        duk_push_string(ctx, entry.contentTypes.c_str()); // [arr entry json]
        duk_json_decode(ctx, -1);                         // [arr entry contentTypes]
        duk_put_prop_string(ctx, -2, "contentTypes");     // [arr entry]
        duk_put_prop_index(ctx, -2, i++);                 // [arr]
    }
    return 1;
}
