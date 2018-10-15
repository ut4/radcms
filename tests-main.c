#include "tests/site-graph-tests.h"
#include "tests/v-tree-tests.h"
#include "tests/website-mapper-tests.h"

static unsigned
runIf(const char *arg, const char *match, void (*suite)()) {
    if (strcmp(arg, match) == 0 || strcmp(arg, "all") == 0) {
        suite();
        printf("%sTests done.\n", match);
        return 1;
    }
    return 0;
}

int main(int argc, const char* argv[]) {
    if (argc < 2) {
        printToStdErr("Usage: tests testname\n");
        exit(EXIT_FAILURE);
    }
    atexit(printMemoryReport);
    const char *testSuiteName = argv[1];
    int testSuitesRan = 0;
    testSuitesRan += runIf(testSuiteName, "siteGraph", siteGraphTestsRun);
    testSuitesRan += runIf(testSuiteName, "websiteMappwe", websiteMapperTestsRun);
    testSuitesRan += runIf(testSuiteName, "vTree", vTreeTestsRun);
    if (testSuitesRan > 0) {
        printf("------------------------\nRan %d test suites.\n", testSuitesRan);
        exit(EXIT_SUCCESS);
    } else {
        printToStdErr("Unknown test suite %s", testSuiteName);
        exit(EXIT_FAILURE);
    }
}
