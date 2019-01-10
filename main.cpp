#include <cstring>
#include <iostream>
#include <memory>
#include <jsx-transpiler.hpp>
#include "include/core-handlers.hpp"
#include "include/duk.hpp"
#include "include/js-environment.hpp"
#include "include/static-data.hpp"
#include "include/web-app.hpp"
#include "include/website.hpp"

static int
handleRun(const char *sitePath);

static int
handleInit(const std::string &sampleDataName, const char *sitePath);

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
    duk_context *ctx = nullptr;
    int out = EXIT_FAILURE;
    if (!webApp.init(sitePath)) goto done;
    if (!db.open(webApp.ctx.sitePath + "data.db", webApp.ctx.errBuf)) goto done;
    webApp.ctx.db = &db;
    if (!(ctx = myDukCreate(webApp.ctx.errBuf))) goto done;
    transpilerInit();
    transpilerSetPrintErrors(false); // use transpilerGetLastError() instead.
    jsEnvironmentConfigure(ctx, &webApp.ctx);
    if (!dukUtilsCompileAndRunStrGlobal(ctx, "require('website.js').website.init();"
                                        "require('website-handlers.js');", "main.js",
                                        webApp.ctx.errBuf)) {
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
    transpilerFreeProps();
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << webApp.ctx.errBuf << "\n";
        return EXIT_FAILURE;
    }
    return out;
}

static int
handleInit(const std::string &sampleDataName, const char *sitePathIn) {
    SampleData *sampleData = getSampleData(sampleDataName);
    if (!sampleData) {
        std::cerr << "[Fatal]: " << sampleDataName <<
                     " is not valid sample data name.\n";
        return EXIT_FAILURE;
    }
    std::string err;
    Db db;
    std::string sitePath = sitePathIn;
    myFsNormalizePath(sitePath);
    if (!db.open(sitePath + "data.db", err)) {
        std::cerr << "[Fatal]: " << err << "\n";
        return EXIT_FAILURE;
    }
    //
    std::cout << "[Info]: Starting to write sample data '" << sampleDataName <<
                 "' to '" << sitePath << "'...\n";
    if (!websiteInstall(sitePath, sampleData, &db, err)) {
        std::cerr << "[Fatal]: " << err << "\n";
    }
    std::cout << "[Info]: Wrote sample data.\n";
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
