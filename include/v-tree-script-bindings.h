#ifndef insn_vTreeScriptBindings_h
#define insn_vTreeScriptBindings_h

#include <stdbool.h>
#include "duk.h"
#include "v-tree.h"

/**
 * Makes vTree.registerElement() etc. accessible to? scripts.
 */
void
vTreeScriptBindingsRegister(duk_context *ctx);

/**
 * Runs $layoutCode.
 */
bool
vTreeScriptBindingsExecLayout(duk_context *ctx, char *layoutCode, VTree *vTree,
                              char *err);

#endif