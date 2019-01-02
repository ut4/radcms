#pragma once

#include <iostream>
#include <duktape.h>
#include <duk_module_duktape.h>

/**
 * Allocates, configures and returns a duk_context or nullptr.
 */
duk_context*
myDukCreate(std::string &errBuf);

/**
 * Compiles $code, and leaves the result on the top of the duktape stack.
 */
bool
dukUtilsCompileStrToFn(duk_context *ctx, const char *code, const char *fileName,
                       std::string &err);

/**
 * Compiles and runs $code in global scope.
 */
bool
dukUtilsCompileAndRunStrGlobal(duk_context *ctx, const char *code,
                               const char *fileName, std::string &err);

void
dukUtilsDumpStack(duk_context *ctx);

void
dukUtilsPutDetailedError(duk_context *ctx, int errorObjIdAt,
                         const char *fileName, std::string &err);
