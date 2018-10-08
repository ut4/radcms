#include <stdio.h>
#include <stdlib.h>
#include "include/web-app.h"

int main(int argc, const char* argv[]) {
    char errBuf[ERR_BUF_LEN];
    errBuf[0] = '\0';
    if (argc < 3) {
        printToStdErr("Usage: insane init|run /path/to/your/project/\n");
        exit(EXIT_FAILURE);
    }
    atexit(printMemoryReport);
    WebApp app;
    webAppInit(&app);
    if (strcmp(argv[1], "init") != 0) { // run
        if (!webAppMakeSiteIni(&app, argv[2], true, errBuf)) goto fail;
    } else { // init
        printToStdErr("insane init not implemented.\n");
    }
    webAppDestruct(&app);
    printf("ok\n");
    exit(EXIT_SUCCESS);
    fail:
        printToStdErr(errBuf);
        webAppDestruct(&app);
        exit(EXIT_FAILURE);
}
