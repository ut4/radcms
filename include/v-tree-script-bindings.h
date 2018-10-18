#ifndef insn_vTreeScriptBindings_h
#define insn_vTreeScriptBindings_h

#include <stdbool.h>
#include "data-queries.h" // DocumentDataConfig
#include "duk.h"
#include "v-tree.h"

void
vTreeScriptBindingsRegister(duk_context *ctx);

/**
 * Runs $layoutCode.
 */
bool
vTreeScriptBindingsExecLayout(duk_context *ctx, char *layoutCode, VTree *vTree,
                              DocumentDataConfig *ddc, char *err);

#endif