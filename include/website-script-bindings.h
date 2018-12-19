#ifndef insn_websiteScriptBindings_h
#define insn_websiteScriptBindings_h

#include "common-script-bindings.h" // commonScriptBindingsPushDirectiveRegister()
#include "duk.h"

void
websiteScriptBindingsInit(duk_context *ctx, char *err);

/** dukStash._pageDataJsImpl = new PageData() */
void
websiteScriptBindingsSetStashedPageData(duk_context *ctx);

/** return JSON.stringify(dukStash._pageDataJsImpl) */
const char*
websiteScriptBindingsStrinfigyStashedPageData(duk_context *ctx,
                                              int dukStashIsAt, char *err);

#endif