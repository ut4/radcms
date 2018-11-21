#ifndef insn_websiteMapperTests_h
#define insn_websiteMapperTests_h

#include <unistd.h> // getcwd
#include "testlib.h" // assertThat
#include "test-utils.h" // testUtilsSetupTestDb()
#include "../include/website.h" // siteGraph*()
#include "../../include/data-query-script-bindings.h"
#include "../../include/v-tree-script-bindings.h"

void
websiteMapperTestsRun();

#endif