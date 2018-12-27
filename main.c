#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <time.h>
#include "include/web/component-handlers.h" // componentHandlersHandle*()
#include "include/web/core-handlers.h" // coreHandlersHandle*()
#include "include/web/website-handlers.h" // websiteHandlersHandle*()
#include "include/common-script-bindings.h"
#include "include/data-query-script-bindings.h"
#include "include/db.h"
#include "include/duk.h"
#include "include/common/memory.h" // printMemoryReport()
#include "include/v-tree-script-bindings.h"
#include "include/website-script-bindings.h"
#include "include/web/web-app.h"

static volatile int isCtrlCTyped = 0;

static void onCtrlC(int _) {
    isCtrlCTyped = 1;
}

static void printCmdInstructionsAndExit() {
    printToStdErr("Usage: insane run /path/to/your/project/\n"
                  "       insane init minimal|blog /path/to/your/project/\n");
    exit(EXIT_FAILURE);
}

int main(int argc, const char* argv[]) {
    char errBuf[ERR_BUF_LEN];
    errBuf[0] = '\0';
    if (argc < 3) printCmdInstructionsAndExit();
    bool doInit = strcmp(argv[1], "init") == 0;
    if (doInit && argc < 4) printCmdInstructionsAndExit();
    //
    atexit(printMemoryReport);


    //const char* ibuf = "compute sha1";
    //unsigned char obuf[20];
    //SHA1(ibuf, strlen(ibuf), obuf);
    //int i;
    //for (i = 0; i < 20; i++) {
    //    printf("%02x ", obuf[i]);
    //}
    //printf("\n");


    int exitStatus = EXIT_FAILURE;
    Website website;
    websiteInit(&website);
    WebApp app;
    webAppInit(&app, argv[2 + (int)doInit], &website, errBuf);
    if (strlen(errBuf)) { goto done; }
    duk_context *dukCtx = NULL;
    Db db;
    /*
     * Configure third party libs
     */
    {
        dukCtx = myDukCreate(errBuf);
        if (!dukCtx) goto done;
        commonScriptBindingsInit(dukCtx, &db, errBuf); // services.app, services.db, Response etc.
        if (strlen(errBuf)) goto done;
        vTreeScriptBindingsInit(dukCtx); // vTree object
        dataQueryScriptBindingsInit(dukCtx); // documentDataConfig object
        websiteScriptBindingsInit(dukCtx, &website.siteGraph, errBuf); // services.website, pageData object
        if (strlen(errBuf)) goto done;
        //
        dbInit(&db);
        STR_CONCAT(dbFilePath, app.sitePath, "data.db");
        if (doInit && !fileIOMakeDirs(app.sitePath, errBuf)) goto done;
        if (!dbOpen(&db, dbFilePath, errBuf)) goto done;
    }
    website.sitePath = app.sitePath;
    website.dukCtx = dukCtx;
    website.db = &db;
    website.errBuf = errBuf;
    /*
     * Handle `insane init`
     */
    if (doInit) {
        unsigned sampleDataIndex = strcmp(argv[2], "blog") == 0 ? 1 : 0;
        SampleData *installData = getSampleData(sampleDataIndex);
        if (!webAppReadOrCreateSiteIni(&app, installData->siteIniContents,
                                       errBuf)) {
            goto done;
        }
        if (websiteInstall(&website, installData, getDbSchemaSql(), errBuf)) {
            exitStatus = EXIT_SUCCESS;
        }
        goto done;
    }
    /*
     * Handle `insane run`
     */
    if (!webAppReadOrCreateSiteIni(&app, "", errBuf) ||
        !websiteFetchAndParseSiteGraph(&website, errBuf) ||
        !webAppExecModuleScripts(&app, (const char*[]){
                                    "/src/web/component-handlers.js",
                                    "/src/web/website-handlers.js",
                                }, 2, dukCtx, errBuf) ||
        !websitePopulateDukCaches(&website, errBuf)) goto done;
    app.handlerCount = sizeof(app.handlers) / sizeof(RequestHandler);
    app.handlers[0] = (RequestHandler){.handlerFn=componentHandlersHandleComponentAddRequest,
        .myPtr=&website, .formDataHandlers=componentHandlersGetComponentAddDataHandlers()};
    app.handlers[1] = (RequestHandler){.handlerFn=coreHandlersHandleStaticFileRequest,
        .myPtr=&app, .formDataHandlers=NULL};
    app.handlers[2] = (RequestHandler){.handlerFn=websiteHandlersHandleGenerateRequest,
        .myPtr=&website, .formDataHandlers=NULL};
    app.handlers[3] = (RequestHandler){.handlerFn=websiteHandlersHandleUploadRequest,
        .myPtr=&website, .formDataHandlers=websiteHandlersGetUploadDataHandlers()};
    app.handlers[4] = (RequestHandler){.handlerFn=coreHandlersHandleScriptRouteRequest,
        .myPtr=dukCtx, .formDataHandlers=NULL};
    app.handlers[5] = (RequestHandler){.handlerFn=websiteHandlersHandlePageRequest,
        .myPtr=&website, .formDataHandlers=NULL};
    pthread_t fileWatcherThread;
    if (pthread_create(&fileWatcherThread, NULL, webAppStartFileWatcher, &app) == 0) {
        printf("[Info]: Started watching files at '%s'.\n", app.sitePath);
    } else {
        sprintf(errBuf, "Failed to create the fileWatcher thread.\n");
        goto done;
    }
    if (strlen(app.errBuf)) { // webAppStartFileWatcher failed
        goto done;
    }
    if (!webAppStart(&app)) {
        sprintf(errBuf, "Failed to start the server.\n");
        goto done;
    }
    signal(SIGINT, onCtrlC);
    struct timespec t = {.tv_sec=0, .tv_nsec=80000000L}; // 80ms
    printf("[Info]: Started server at localhost:3000. Hit Ctrl+C to stop it...\n");
    while (!isCtrlCTyped) nanosleep(&t, NULL);
    exitStatus = EXIT_SUCCESS;
    //
    done:
        if (exitStatus == EXIT_FAILURE) printToStdErr("[Fatal]: %s", errBuf);
        websiteFreeProps(&website);
        webAppFreeProps(&app);
        if (dukCtx) duk_destroy_heap(dukCtx);
        dbDestruct(&db);
        exit(exitStatus);
}
