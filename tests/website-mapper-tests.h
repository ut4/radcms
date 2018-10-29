#ifndef insn_websiteMapperTests_h
#define insn_websiteMapperTests_h

#include <limits.h> // PATH_MAX
#include <unistd.h> // getcwd
#include "testlib.h" // assertThat
#include "test-utils.h" // testUtilsSetupTestDb()
#include "../include/web/website.h" // PageArray, siteGraph*()
#include "../../include/data-query-script-bindings.h"
#include "../../include/v-tree-script-bindings.h"

void
websiteMapperTestsRun();

#endif