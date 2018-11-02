#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include "include/data-query-script-bindings.h"
#include "include/db.h"
#include "include/duk.h"
#include "include/v-tree-script-bindings.h"
#include "include/web-app.h"

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
    int exitStatus = EXIT_FAILURE;
    Website website;
    websiteInit(&website);
    WebApp app;
    webAppInit(&app, argv[2 + (int)doInit], &website, errBuf);
    duk_context *dukCtx = NULL;
    Db db;
    /*
     * Configure third party libs
     */
    {
        dukCtx = myDukCreate(errBuf);
        if (!dukCtx) goto done;
        vTreeScriptBindingsRegister(dukCtx); // vTree object
        dataQueryScriptBindingsRegister(dukCtx); // documentDataConfig object
        //
        dbInit(&db);
        STR_CONCAT(dbFilePath, app.rootDir, "data.db");
        if (doInit && !fileIOMakeDirs(app.rootDir, errBuf)) goto done;
        if (!dbOpen(&db, dbFilePath, errBuf)) goto done;
    }
    website.rootDir = app.rootDir;
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
        !websitePopulateTemplateCaches(&website, errBuf)) goto done;
    app.handlers[0] = (RequestHandler){.methodPattern="GET", .urlPattern="/int/cpanel",
        .handlerFn=websiteHandlersHandleCPanelIframeRequest, .this=NULL};
    app.handlers[1] = (RequestHandler){.methodPattern="GET", .urlPattern="/api/website/generate",
        .handlerFn=websiteHandlersHandleGenerateRequest, .this=(void*)&website};
    app.handlers[2] = (RequestHandler){.methodPattern="GET", .urlPattern="/*",
        .handlerFn=websiteHandlersHandlePageRequest, .this=(void*)&website};
    pthread_t fileWatcherThread;
    if (pthread_create(&fileWatcherThread, NULL, webAppStartFileWatcher,
                       (void*)&app)) {
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
    printf("Started server at localhost:3000. Hit Ctrl+C to stop it...\n");
    (void)getchar();
    exitStatus = EXIT_SUCCESS;
    //
    done:
        if (exitStatus == EXIT_FAILURE) printToStdErr(errBuf);
        websiteFreeProps(&website);
        webAppFreeProps(&app);
        if (dukCtx) duk_destroy_heap(dukCtx);
        dbDestruct(&db);
        exit(exitStatus);
}
