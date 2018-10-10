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
    const char *c = "5|24/|0|5/foo|0|8/f/b|5|6/b/z|8|2/baz|0";
    if (!siteGraphParse((char*)c, &siteGraph, errBuf)) goto fail;
    printf("Ok: ");
    printf("siteGraph: ");
    for (unsigned i = 0; i < siteGraph.length; ++i) {
        printf("id: %d, url: %s, parentId: %d\n",
            siteGraph.values[i].id,
            siteGraph.values[i].url,
            siteGraph.values[i].parentId
        );
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
