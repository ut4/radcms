#include <stdio.h>
#include <stdlib.h>
#include "include/web-app.h"
#include "include/website.h"

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
    PageArray siteGraph;
    if (strcmp(argv[1], "init") != 0) { // run
        if (!webAppMakeSiteIni(&app, argv[2], true, errBuf)) goto fail;
    } else { // init
        printToStdErr("insane init not implemented.\n"); goto fail;
    }
    const char *c="4e24en5e12en<2en<";
    if (!pageGraphParse((char*)c, strlen(c), &siteGraph)) goto fail;
    printf("Ok: ");
    printf("pageGraph: ");
    for (unsigned i = 0; i < siteGraph.length; ++i) {
        printf("id: %d, level: %d\n", siteGraph.values[i].id, siteGraph.values[i].level);
    }
    webAppDestruct(&app);
    pageArrayDestruct(&siteGraph);
    exit(EXIT_SUCCESS);
    fail:
        printToStdErr(errBuf);
        webAppDestruct(&app);
        pageArrayDestruct(&siteGraph);
        exit(EXIT_FAILURE);
}
