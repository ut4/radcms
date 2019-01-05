#include <cstring>
#include <iostream>
#include <memory>
#include "include/core-handlers.hpp"
#include "include/duk.hpp"
#include "include/js-environment.hpp"
#include "include/web-app.hpp"

static int
handleRun(const char *sitePath);

static int
handleInit(const char *sitePath, const char *sampleDataName);

static int
printCmdInstructions();

static void
myAtExit();

int
main(int argc, char *argv[]) {
    if (argc < 3) return printCmdInstructions();
    bool doInit = strcmp(argv[1], "init") == 0;
    if (doInit && argc < 4) return printCmdInstructions();
    atexit(myAtExit);
    //
    return !doInit ? handleRun(argv[2]) : handleInit(argv[2], argv[3]);
}

static int
handleRun(const char *sitePath) {
    //
    WebApp webApp;
    Db db;
    duk_context *ctx;
    int out = EXIT_FAILURE;
    if (!webApp.init(sitePath)) goto done;
    if (!db.open(webApp.ctx.sitePath + "data.db", webApp.ctx.errBuf)) goto done;
    webApp.ctx.db = &db;
    if (!(ctx = myDukCreate(webApp.ctx.errBuf))) goto done;
    jsEnvironmentConfigure(ctx, &webApp.ctx);
    if (!dukUtilsCompileAndRunStrGlobal(ctx, "require('website-handlers.js')",
                                        "main.js", webApp.ctx.errBuf)) {
        goto done;
    }
    //
    webApp.handlers[0] = {coreHandlersHandleStaticFileRequest, &webApp, nullptr};
    webApp.handlers[1] = {coreHandlersHandleScriptRouteRequest, ctx, nullptr};
    if (webApp.run()) {
        out = EXIT_SUCCESS;
    }
    done:
    if (ctx) duk_destroy_heap(ctx);
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << webApp.ctx.errBuf << "\n";
        return EXIT_FAILURE;
    }
    return out;
}

static int
handleInit(const char *sitePath, const char *sampleDataName) {
    return EXIT_SUCCESS;
}

static int
printCmdInstructions() {
    std::cerr << "Usage: insane run /path/to/your/project/\n"
                 "       insane init minimal|blog /path/to/your/project/\n";
    return EXIT_FAILURE;
}

static void
myAtExit() {
    std::cout << "[Info]: Application exited cleanly.\n";
}
