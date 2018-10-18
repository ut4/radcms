#ifndef dataQueryScriptBindings_h
#define dataQueryScriptBindings_h

#include "data-queries.h"
#include "duk.h"

void
dataQueryScriptBindingsRegister(duk_context *ctx);

/**
 * Stores $ddc to the duktape thread/ctx stash.
 */
void
dataQuerySBSetStashedDocumentDataConfig(duk_context *ctx, DocumentDataConfig *ddc);

#endif