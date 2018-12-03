#ifndef insn_dataDefScriptBindings_h
#define insn_dataDefScriptBindings_h

#include "directive-script-bindings.h" // directiveScriptBindingsPushFactories()
#include "duk.h"

void
dataDefScriptBindingsRegister(duk_context *ctx, char *err);

/** threadStash._pageData = new PageData() */
void
dataDefScriptBindingsSetStashedPageData(duk_context *ctx);

/** return JSON.stringify(threadStash._pageData) */
const char*
dataDefScriptBindingsStrinfigyStashedPageData(duk_context *ctx, char *err);

#endif