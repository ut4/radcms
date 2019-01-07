#include <iostream>
#include <memory>
#include <string>
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
        std::cerr << "Usage: tests suitename|all\n";
        return EXIT_FAILURE;
    }
    atexit(myAtExit);
    AppContext testJsEnv;
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
        if (testSuiteName != "all" &&
            testSuiteName != "common-services" &&
            testSuiteName != "website-handlers") {
            testJsEnv.errBuf = "Unknown test suite '" + testSuiteName + "'";
            goto done;
        }
        if (dukUtilsCompileAndRunStrGlobal(ctx, ("require('tests/main.js').main('" +
            testSuiteName + "')").c_str(),
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
