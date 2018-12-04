#ifndef insn_commonScriptBindings_h
#define insn_commonScriptBindings_h

#include "db.h"
#include "duk.h"

void
commonScriptBindingsRegister(duk_context *ctx, Db *db, char *err);

void
commonScriptBindingsPushDb(duk_context *ctx, int threadStashIsAt);

void
commonScriptBindingsPushApp(duk_context *ctx, int threadStashIsAt);

#endif