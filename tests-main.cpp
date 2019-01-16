#include <iostream>
#include <memory>
#include <string>
#include <unistd.h> // getcwd
#include "include/db.hpp"
#include "include/duk.hpp"
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
    char cwd[FILENAME_MAX];
    if (!getcwd(cwd, FILENAME_MAX)) {
        testJsEnv.errBuf = "Failed to getcwd().\n";
        return false;
    }
    testJsEnv.appPath = cwd;
    myFsNormalizePath(testJsEnv.appPath);
    testJsEnv.sitePath = testJsEnv.appPath + "js/tests/testsite/";
    Db db;
    duk_context *ctx;
    int out = EXIT_FAILURE;
    if (!testUtilsSetupTestDb(&db, testJsEnv.errBuf)) goto done;
    testJsEnv.db = &db;
    if (!(ctx = myDukCreate(testJsEnv.errBuf))) goto done;
    jsEnvironmentConfigure(ctx, &testJsEnv);
    //
    {
        const std::string testSuiteName = argv[1];
        const std::string useVerboseLogging = argc < 3 ? "false" : "true";
        if (testSuiteName != "all" &&
            testSuiteName != "common-services" &&
            testSuiteName != "component-handlers" &&
            testSuiteName != "file-watchers" &&
            testSuiteName != "website-handlers") {
            testJsEnv.errBuf = "Unknown test suite '" + testSuiteName + "'";
            goto done;
        }
        if (dukUtilsCompileAndRunStrGlobal(ctx, ("require('tests/main.js').main('" +
            testSuiteName + "'," + useVerboseLogging + ")").c_str(),
            "tests/main.js", testJsEnv.errBuf)) {
            out = EXIT_SUCCESS;
        }
    }
    //
    done:
    if (ctx) duk_destroy_heap(ctx);
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << testJsEnv.errBuf << "\n";
        return EXIT_FAILURE;
    }
    return out;
}
