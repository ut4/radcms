#ifndef insn_directiveScriptBindings_h
#define insn_directiveScriptBindings_h

#include "duk.h"

void
directiveScriptBindingsRegister(duk_context *ctx, char *err);

/** threadStash.directiveFactories[directiveName] = threadStash.cachedFns[cachedFnKey] */
void
directiveFactoriesPutCachedFn(duk_context *ctx, const char *directiveName,
                              const char *cachedFnKey);

#endif