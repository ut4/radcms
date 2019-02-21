#include <cstring>
#include <iostream>
#include <pthread.h>
#include <passcod-notify.hpp>
#include "include/core-handlers.hpp"
#include "include/js-environment.hpp"
#include "include/static-data.hpp"
#include "include/web-app.hpp"
#include "include/website.hpp"

static int handleRun(const std::string &sitePath);
static int handleInit(const std::string &sampleDataName, const char *sitePath);
static int handleImport(const std::string &importType, const char *arg,
                        const std::string &sitePath);
static void* startFileWatcher(void *myPtr);
static int printCmdInstructions();
static void myAtExit();

int
main(int argc, char *argv[]) {
    if (argc < 3) return printCmdInstructions();
    bool doInit = strcmp(argv[1], "init") == 0;
    bool doImport = !doInit && strcmp(argv[1], "import") == 0;
    if (doInit && argc < 4) return printCmdInstructions();
    if (doImport && argc < 5) return printCmdInstructions();
    atexit(myAtExit);
    //
    if (doInit) {
        return handleInit(argv[2], argv[3]);
    }
    if (doImport) {
        return handleImport(argv[2], argv[3], argv[4]);
    }
    return handleRun(argv[2]);
}

static int
handleRun(const std::string &sitePath) {
    //
    AppContext appCtx;
    WebApp webApp;
    int out = EXIT_FAILURE;
    if (!appCtx.init(sitePath)) goto done;
    webApp.ctx = &appCtx;
    jsEnvironmentConfigure(appCtx.dukCtx, &appCtx);
    if (!dukUtilsCompileAndRunStrGlobal(appCtx.dukCtx, "require('main.js')",
                                        "main.js", appCtx.errBuf)) {
        goto done;
    }
    //
    pthread_t fileWatcherThread;
    if (pthread_create(&fileWatcherThread, nullptr, startFileWatcher,
                       &appCtx) == 0) {
        std::cout << "[Info]: Started watching files at '" <<
                     appCtx.sitePath << "'.\n";
    } else {
        appCtx.errBuf = "Failed to create the fileWatcher thread.";
        goto done;
    }
    webApp.handlers[0] = {coreHandlersHandleStaticFileRequest, &appCtx, nullptr};
    webApp.handlers[1] = {coreHandlersHandleScriptRouteRequest, appCtx.dukCtx,
                          coreHandlersGetScriptRoutePostDataHandlers(appCtx.dukCtx)};
    if (webApp.run()) {
        out = EXIT_SUCCESS;
    }
    done:
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << appCtx.errBuf << "\n";
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
handleImport(const std::string &importType, const char *arg,
             const std::string &sitePath) {
    AppContext appCtx;
    int out = EXIT_FAILURE;
    if (importType == "wp") {
        // todo validate arg
    } else {
        appCtx.errBuf = "Unknown importer '" + importType + "' (Available: 'wp').";
        goto done;
    }
    if (!appCtx.init(sitePath)) goto done;
    jsEnvironmentConfigure(appCtx.dukCtx, &appCtx);
    if (dukUtilsCompileAndRunStrGlobal(appCtx.dukCtx,
        ("require('data-importers.js').import('" + importType + "','" + arg + "')").c_str(),
        "data-importer.js", appCtx.errBuf)) {
        out = EXIT_SUCCESS;
    }
    done:
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << appCtx.errBuf << "\n";
    }
    return out;
}

static void*
startFileWatcher(void *myPtr) {
    fileWatcherWatch(static_cast<AppContext*>(myPtr)->sitePath.c_str(),
        [](FWEventType type, const char *filePath, void *myPtr) {
            if (type == FW_EVENT_RESCAN) return;
            if (type == FW_EVENT_ERROR) {
                std::cerr << "[Error]: Got an error from fileWatcher\n";
                return;
            }
            char *ext = strrchr(filePath, '.');
            if (ext && (
                strcmp(ext, ".htm") == 0 ||
                strcmp(ext, ".js") == 0 ||
                strcmp(ext, ".css") == 0 ||
                strcmp(ext, ".ini") == 0 ||
                strcmp(ext, ".jsx") == 0
            )) {
                commonServicesCallJsFWFn(type,
                    // /full/path/file.js -> file.js
                    &filePath[static_cast<AppContext*>(myPtr)->sitePathLen],
                    &ext[1],
                    myPtr);
            }
        }, myPtr);
    return NULL;
}

static int
printCmdInstructions() {
    std::cerr << "Usage: insane run /path/to/your/project/\n"
                 "       insane init minimal|blog /path/to/your/project/\n"
                 "       insane import wp /path/to/exported-wp-site.xml /path/to/your/project/\n";
    return EXIT_FAILURE;
}

static void
myAtExit() {
    std::cout << "[Info]: Application exited cleanly.\n";
}
