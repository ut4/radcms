#ifndef insn_commonScriptBindings_h
#define insn_commonScriptBindings_h

#include "db.h"
#include "duk.h"
#include "site-graph.h"

void
commonScriptBindingsInit(duk_context *ctx, Db *db, SiteGraph *siteGraph, char *err);

void
commonScriptBindingsPushDb(duk_context *ctx, int threadStashIsAt);

void
commonScriptBindingsPushApp(duk_context *ctx, int threadStashIsAt);

void
commonScriptBindingsPushDirectiveRegister(duk_context *ctx, int threadStashItAt);

void
commonScriptBindingsPutDirective(duk_context *ctx, const char *directiveName,
                                 int threadStashIsAt);

#endif