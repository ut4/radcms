#ifndef insn_duk_h
#define insn_duk_h

#include <duktape.h>
#include "common.h" // putError

/**
 * Allocates, configures and returns a duk_context. Returns NULL on failure.
 */
duk_context*
myDukCreate(char *errBuf);

/**
 * Compiles $code, and leaves the result on the top of the duktape stack.
 */
bool
dukUtilsCompileStrToFn(duk_context *ctx, const char *code, const char *fileName,
                       char *err);

void
dukUtilsDumpStack(duk_context *ctx);

void
dukUtilsPutDetailedError(duk_context *ctx, int errorObjIdAt,
                         const char *fileName, char *err);

#endif