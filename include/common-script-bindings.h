#ifndef insn_commonScriptBindings_h
#define insn_commonScriptBindings_h

#include "db.h"
#include "duk.h"
#include "site-graph.h"

void
commonScriptBindingsInit(duk_context *ctx, Db *db, char *err);

void
commonScriptBindingsPushServices(duk_context *ctx, int dukStashIsAt);

void
commonScriptBindingsPushDb(duk_context *ctx, int dukStashIsAt);

void
commonScriptBindingsPushApp(duk_context *ctx, int dukStashIsAt);

void
commonScriptBindingsPushDirectiveRegister(duk_context *ctx, int dukStashIsAt);

void
commonScriptBindingsPutDirective(duk_context *ctx, const char *directiveName,
                                 int dukStashIsAt);

#endif