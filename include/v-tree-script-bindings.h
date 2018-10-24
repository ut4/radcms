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
 * Runs $layoutCode.
 */
bool
vTreeScriptBindingsExecLayout(duk_context *ctx, char *layoutCode, VTree *vTree,
                              DocumentDataConfig *ddc, const char *url,
                              char *err);

/**
 * Runs $templateCode. Returns the id of the root element of the template on
 * success, or 0 on failure.
 */
unsigned
vTreeScriptBindingsExecTemplate(duk_context *ctx, char *templateCode,
                                VTree *vTree, DataBatchConfig *dbc,
                                ComponentArray *allComponents, bool isRenderAll,
                                const char *url, char *err);

#endif