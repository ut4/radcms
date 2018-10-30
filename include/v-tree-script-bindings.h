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
vTreeScriptBindingsCompileAndExecLayoutWrap(duk_context *ctx, char *layoutCode,
                                        DocumentDataConfig *ddc,
                                        const char *url, char *err);

/**
 * Same as vTreeScriptBindingsCompileAndExecLayout, but retrieves the layout
 * -function from the duktape thread stash, using $layoutName as a key. Note:
 * assumes that duk_push_thread_stash is already called. */
bool
vTreeScriptBindingsExecLayoutWrapFromCache(duk_context *ctx, char *layoutName,
                                           DocumentDataConfig *ddc,
                                           const char *url, char *err);

bool
vTreeScriptBindingsExecLayoutTmpl(duk_context *ctx, VTree *vTree,
                                  DataBatchConfig *batches,
                                  ComponentArray *allComponents, char *err);

/**
 * Compiles and runs $templateCode. Returns the id of the root element of the
 * template on success, or 0 on failure.
 */
unsigned
vTreeScriptBindingsCompileAndExecTemplate(duk_context *ctx, char *templateCode,
                                          VTree *vTree, DataBatchConfig *dbc,
                                          ComponentArray *allComponents,
                                          bool isFetchAll, const char *url,
                                          char *err);

/**
 * Same as vTreeScriptBindingsCompileAndExecTemplate, but retrieves the template
 * -function from the duktape thread stash, using $dbc->renderWith as a key.
 * Note: assumes that duk_push_thread_stash is already called. */
unsigned
vTreeScriptBindingsExecTemplateFromCache(duk_context *ctx, VTree *vTree,
                                         DataBatchConfig *dbc,
                                         ComponentArray *allComponents,
                                         bool isFetchAll, const char *url,
                                         char *err);

#endif