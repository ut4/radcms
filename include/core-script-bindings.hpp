#pragma once

#include <cassert>
#include "db.hpp"
#include "duk.hpp"

void
coreScriptBindingsInit(duk_context *ctx, Db *db, char *appPath,
                       std::string &err);

void
coreScriptBindingsClean(duk_context *ctx);

void
coreScriptBindingsPushServices(duk_context *ctx, int dukStashIsAt);

void
coreScriptBindingsPushDb(duk_context *ctx, int dukStashIsAt);

void
coreScriptBindingsPushApp(duk_context *ctx, int dukStashIsAt);