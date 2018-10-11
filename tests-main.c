#include "tests/site-graph-tests.h"
#include "tests/website-mapper-tests.h"

int main(int argc, const char* argv[]) {
    if (argc < 2) {
        printToStdErr("Usage: tests testname\n");
        exit(EXIT_FAILURE);
    }
    atexit(printMemoryReport);
    const char *testSuiteName = argv[1];
    bool runAll = strcmp(testSuiteName, "all") == 0;
    int testSuitesRan = 0;
    if (strcmp(testSuiteName, "siteGraph") == 0 || runAll) {
        siteGraphTestsRun();
        printf("SiteGraphTests done.\n");
        testSuitesRan++;
    }
    if (strcmp(testSuiteName, "webSiteMapper") == 0 || runAll) {
        websiteMapperTestsRun();
        printf("WebsiteMapperTests done.\n");
        testSuitesRan++;
    }
    if (testSuitesRan > 0) {
        printf("------------------------\nRan %d test suites.\n", testSuitesRan);
        exit(EXIT_SUCCESS);
    } else {
        printToStdErr("Unknown test suite %s", testSuiteName);
        exit(EXIT_FAILURE);
    }
}
