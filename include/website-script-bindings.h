#ifndef insn_websiteScriptBindings_h
#define insn_websiteScriptBindings_h

#include "common-script-bindings.h" // commonScriptBindingsPushDirectiveRegister()
#include "duk.h"

void
websiteScriptBindingsInit(duk_context *ctx, char *err);

/** threadStash._pageDataJsImpl = new PageData() */
void
websiteScriptBindingsSetStashedPageData(duk_context *ctx);

/** return JSON.stringify(threadStash._pageDataJsImpl) */
const char*
websiteScriptBindingsStrinfigyStashedPageData(duk_context *ctx,
                                              int threadStashIsAt, char *err);

#endif