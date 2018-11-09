#ifndef insn_vTreeScriptBindings_h
#define insn_vTreeScriptBindings_h

#include <stdbool.h>
#include "data-defs.h" // Component
#include "data-query-script-bindings.h" // DocumentDataConfig
#include "duk.h"
#include "v-tree.h" // VTree

void
vTreeScriptBindingsRegister(duk_context *ctx);

/**
 * Compiles and runs $layoutCode.
 */
bool
vTreeScriptBindingsCompileAndExecLayoutWrap(duk_context *ctx, const char *layoutCode,
                                        DocumentDataConfig *ddc,
                                        const char *url, char *err);

/**
 * Same as vTreeScriptBindingsCompileAndExecLayout, but retrieves the layout
 * -function from the duktape thread stash, using $layoutName as a key. Note:
 * assumes that duk_push_thread_stash is already called. */
bool
vTreeScriptBindingsExecLayoutWrapFromCache(duk_context *ctx, const char *layoutName,
                                           DocumentDataConfig *ddc,
                                           const char *url, char *err);

bool
vTreeScriptBindingsExecLayoutTmpl(duk_context *ctx, VTree *vTree,
                                  DataBatchConfig *batches,
                                  ComponentArray *allComponents, char *err);

#endif