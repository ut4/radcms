#include <iostream>
#include <memory>
#include <string>
#include "include/js-environment.hpp"
#include "tests/test-utils.hpp"

static void
myAtExit() {
    std::cout << "[Info]: Tests exited cleanly.\n";
}

int main(int argc, const char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: tests suitename|all verbose?\n";
        return EXIT_FAILURE;
    }
    atexit(myAtExit);
    AppContext testJsEnv;
    testJsEnv.init("");
    testJsEnv.sitePath = testJsEnv.appPath + "js/tests/testsite/";
    int out = EXIT_FAILURE;
    if (!testUtilsSetupTestDb(&testJsEnv.db, testJsEnv.errBuf)) goto done;
    jsEnvironmentConfigure(testJsEnv.dukCtx, &testJsEnv);
    //
    {
        const std::string testSuiteName = argv[1];
        const std::string useVerboseLogging = argc < 3 ? "false" : "true";
        if (testSuiteName != "all" &&
            testSuiteName != "common-services" &&
            testSuiteName != "component-handlers" &&
            testSuiteName != "document-data" &&
            testSuiteName != "file-watchers" &&
            testSuiteName != "website-handlers" &&
            testSuiteName != "website") {
            testJsEnv.errBuf = "Unknown test suite '" + testSuiteName + "'";
            goto done;
        }
        if (dukUtilsCompileAndRunStrGlobal(testJsEnv.dukCtx,
            ("require('tests/main.js').main('" + testSuiteName + "'," +
            useVerboseLogging + ")").c_str(),
            "tests/main.js", testJsEnv.errBuf)) {
            out = EXIT_SUCCESS;
        }
    }
    //
    done:
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << testJsEnv.errBuf << "\n";
        return EXIT_FAILURE;
    }
    return out;
}
