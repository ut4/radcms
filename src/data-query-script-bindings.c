#include "../include/data-query-script-bindings.h"

#define DDC_STASH_KEY "_DocumentDataConfig"
#define DBC_PROTO_KEY "_DataBatchConfigPrototype"

/** Implements global.documentDataConfig.renderOne($componentTypeName) */
static duk_ret_t
documentDataConfigSBRenderOne(duk_context *ctx);

/** Implements $dataBatchConfig.using($templateName) */
static duk_ret_t
dataBatchConfigSBSetRenderWith(duk_context *ctx);

/** Implements $dataBatchConfig.where($sql) */
static duk_ret_t
dataBatchConfigSBSetWhere(duk_context *ctx);

void
dataQueryScriptBindingsRegister(duk_context *ctx) {
    /*
     * global.documentDataConfig object
     */
    duk_push_bare_object(ctx);                        // [... obj]
    duk_push_c_lightfunc(ctx, documentDataConfigSBRenderOne, 1, 1, 0); // [... obj lightfn]
    duk_put_prop_string(ctx, -2, "renderOne");        // [... obj]
    duk_put_global_string(ctx, "documentDataConfig"); // [...]
    /*
     * stashed DataBatchConfig object prototype
     */
    duk_push_thread_stash(ctx, ctx);                        // [... stash]
    duk_push_bare_object(ctx);                              // [... stash obj]
    duk_push_c_function(ctx, dataBatchConfigSBSetRenderWith, 1); // [... stash obj lighfn]
    duk_put_prop_string(ctx, -2, "using");                  // [... stash obj]
    duk_push_c_function(ctx, dataBatchConfigSBSetWhere, 1); // [... stash obj lighfn]
    duk_put_prop_string(ctx, -2, "where");                  // [... stash obj]
    duk_put_prop_string(ctx, -2, DBC_PROTO_KEY);            // [... stash]
    duk_pop(ctx);                                           // [...]
}

void
dataQuerySBSetStashedDocumentDataConfig(duk_context *ctx, DocumentDataConfig *ddc) {
    duk_push_thread_stash(ctx, ctx);             // [... stash]
    duk_push_pointer(ctx, (void*)ddc);           // [... stash ptr]
    duk_put_prop_string(ctx, -2, DDC_STASH_KEY); // [... stash]
    duk_pop(ctx);                                // [...]
}

static void
dataQuerySBPushDbc(duk_context *ctx, DataBatchConfig *dbc) {
    duk_push_object(ctx);                        // [... obj]
    duk_push_uint(ctx, dbc->id);                 // [... obj, uint]
    duk_put_prop_string(ctx, -2, "id");          // [... obj]
    duk_push_thread_stash(ctx, ctx);             // [... obj stash]
    duk_get_prop_string(ctx, -1, DBC_PROTO_KEY); // [... obj stash proto]
    duk_set_prototype(ctx, -3);                  // [... obj stash]
    duk_pop(ctx);                                // [... obj]
}

static duk_ret_t
documentDataConfigSBRenderOne(duk_context *ctx) {
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, DDC_STASH_KEY);
    DocumentDataConfig *ddc = (DocumentDataConfig*)duk_to_pointer(ctx, -1);
    const char *componentTypeName = duk_require_string(ctx, 0); // 1. arg
    DataBatchConfig *dbc = documentDataConfigAddBatch(ddc, componentTypeName, false);
    dataQuerySBPushDbc(ctx, dbc);
    return 1;
}

static duk_ret_t
dataBatchConfigSBSetRenderWith(duk_context *ctx) {
    return 1;
}

static duk_ret_t
dataBatchConfigSBSetWhere(duk_context *ctx) {
    return 1;
}
