#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <time.h>
#include "include/db.h"
#include "include/duk.h"
#include "include/v-tree-script-bindings.h"
#include "include/web-app.h"

static volatile int isCtrlCTyped = 0;

void onCtrlC(int _) {
    isCtrlCTyped = 1;
}

int main(int argc, const char* argv[]) {
    char errBuf[ERR_BUF_LEN];
    errBuf[0] = '\0';
    if (argc < 3) {
        printToStdErr("Usage: insane init|run /path/to/your/project/\n");
        exit(EXIT_FAILURE);
    }
    if (strcmp(argv[1], "init") == 0) {
        printToStdErr("insane init not implemented.\n");
        exit(EXIT_FAILURE);
    }
    atexit(printMemoryReport);
    /*
     * 1. Initialize the web-application
     */
    Website website;
    websiteInit(&website);
    WebApp app = {
        .rootDir = NULL,
        .ini = {.mainLayoutFileName = NULL},
        .daemon = NULL,
        .handlerCount = 0,
        .handlers = {
            {.methodPattern="GET", .urlPattern="/*",
            .handlerFn=websiteHandlersHandlePageRequest, .this=(void*)&website}
        }
    };
    webAppInit(&app, errBuf);
    Db db;
    duk_context *dukCtx;
    /*
     * 2. Parse site.ini
     */
    if (!webAppMakeSiteIni(&app, argv[2], true, errBuf)) goto fail;
    /*
     * 3. Configure third party libs
     */
    {
        dukCtx = myDukCreate(errBuf);
        vTreeScriptBindingsRegister(dukCtx); // <global>.vTree object
        if (!dukCtx) goto fail;
        //
        dbInit(&db);
        STR_CONCAT(dbFilePath, app.rootDir, "data.db");
        if (!dbOpen(&db, dbFilePath, errBuf)) goto fail;
    }
    /*
     * 4. Configure request handlers
     */
    website.rootDir = app.rootDir;
    website.dukCtx = dukCtx;
    if (!websiteFetchAndParseSiteGraph(&website, &db, errBuf)) goto fail;
    /*
     * 5. Start the server
     */
    if (!webAppStart(&app)) {
        sprintf(errBuf, "Failed to start the server.\n");
        goto fail;
    }
    /*
     * 6. Wait
     */
    printf("Started server at localhost:3000. Hit Ctrl+C to stop it...\n");
    signal(SIGINT, onCtrlC);
    struct timespec t = {.tv_sec=0, .tv_nsec=50000000L}; // 50ms / 0.05s
    while (!isCtrlCTyped) nanosleep(&t, NULL);
    /*
     * 7. Clean up after succesful waiting
     */
    webAppShutdown(&app);
    webAppDestruct(&app);
    websiteDestruct(&website);
    dbDestruct(&db);
    if (dukCtx) duk_destroy_heap(dukCtx);
    exit(EXIT_SUCCESS);
    fail:
        printToStdErr(errBuf);
        websiteDestruct(&website);
        webAppDestruct(&app);
        dbDestruct(&db);
        if (dukCtx) duk_destroy_heap(dukCtx);
        exit(EXIT_FAILURE);
}
