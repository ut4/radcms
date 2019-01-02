#include <iostream>
#include <string>
#include "tests/core-script-bindings-tests.cpp"
#include "tests/dom-tree-tests.cpp"

static unsigned
runIf(const std::string &arg, const std::string &match, void (*suite)()) {
    if (arg == match || arg == "all") {
        suite();
        std::cout << match << "Tests done.\n";
        return 1;
    }
    return 0;
}

int main(int argc, const char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: tests testname|all\n";
        exit(EXIT_FAILURE);
    }
    const std::string testSuiteName = argv[1];
    int testSuitesRan = 0;
    testSuitesRan += runIf(testSuiteName, "coreScriptBindings", coreScriptBindingsTestsRun);
    testSuitesRan += runIf(testSuiteName, "domTree", domTreeTestsRun);
    if (testSuitesRan > 0) {
        std::cout << "------------------------\nRan " << testSuitesRan <<
                     " test suites.\n";
        exit(EXIT_SUCCESS);
    } else {
        std::cerr << "Unknown test suite " << testSuiteName;
        exit(EXIT_FAILURE);
    }
}
