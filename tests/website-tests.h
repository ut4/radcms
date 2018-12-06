#ifndef insn_websiteTests_h
#define insn_websiteTests_h

#include "testlib.h" // assertThat
#include "test-utils.h" // testUtilsCompileAndCache()
#include "../include/website.h"
#include "../../include/common-script-bindings.h" // commonScriptBindingsPutDirective()
#include "../../include/data-query-script-bindings.h" // global.documentDataConfig
#include "../../include/v-tree-script-bindings.h" // global.vTree
#include "../../include/website-script-bindings.h" // stash._pageData

void
websiteTestsRun();

#endif