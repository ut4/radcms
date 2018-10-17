#ifndef insn_duk_h
#define insn_duk_h

#include <duktape.h>
#include "common.h" // putError

/**
 * Allocates, configures and returns a duk_context. Returns NULL on failure.
 */
duk_context*
myDukCreate(char *errBuf);

void
dukUtilsDumpStack(duk_context *ctx);

#endif