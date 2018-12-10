#include "../../include/web/website-handlers.h"

static void injectCPanelIframeAndCurrentPageData(char **html,
                                                 const char *pageDataJson);
static void makeCurrentPageDataJson(SiteGraph *siteGraph, VTree *vTree,
                                    void *dukCtx, void *myPtr, char *err);

unsigned
websiteHandlersHandlePageRequest(void *myPtr, void *myDataPtr, const char *method,
                                 const char *url, struct MHD_Connection *conn,
                                 struct MHD_Response **response, char *err) {
    if (strcmp(method, "GET") != 0) return MHD_HTTP_NOT_FOUND;
    Website *site = myPtr;
    Page *p = siteGraphFindPage(&site->siteGraph, (char*)url);
    if (!p) {
        return MHD_HTTP_NOT_FOUND;
    }
    if (MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "rescan")) {
        emitEvent("sitegraphRescanRequested", p);
    }
    const char *pageDataJson;
    char *renderedHtml = pageRender(site, p->layoutIdx, url,
                                    makeCurrentPageDataJson, &pageDataJson,
                                    err);
    if (renderedHtml) {
        injectCPanelIframeAndCurrentPageData(&renderedHtml, pageDataJson);
    } else {
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
#ifdef DEBUG_COUNT_ALLOC
    // freed by microhttpd
    memoryAddToByteCount(-(strlen(renderedHtml) + 1));
#endif
    *response = MHD_create_response_from_buffer(strlen(renderedHtml),
                                                renderedHtml,
                                                MHD_RESPMEM_MUST_FREE);
    return MHD_HTTP_OK;
}

static bool
writePageToFile(char *renderedHtml, Page *page, Website *site, void *myPtr,
                char *err) {
    STR_CONCAT(outDirPath, site->rootDir, "out"); // -> c:/foo/bar/out
    const char* indexPart = "/index.html";
    //
    const size_t urlStrLen = strlen(page->url);
    const size_t l2 = strlen(outDirPath) + urlStrLen + strlen(indexPart) + 1;
    char filePath[l2];
    // 'c:/foo/bar/out' + '/foo'
    // 'c:/foo/bar/out' + '/'
    snprintf(filePath, l2, "%s%s", outDirPath, page->url);
    if (!fileIOMakeDirs(filePath, err)) {
        return false;
    }
    // 'c:/foo/bar/out/foo + '/index.html'
    // 'c:/foo/bar/out/'   + 'index.html'
    strcat(filePath, indexPart + (urlStrLen > 1 ? 0 : 1));
    return fileIOWriteFile(filePath, renderedHtml, err);
}

unsigned
websiteHandlersHandleGenerateRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Connection *conn,
                                     struct MHD_Response **response, char *err) {
    if (strcmp(method, "POST") != 0 || strcmp(url, "/api/website/generate") != 0) return 0;
    Website *site = myPtr;
    timerInit();
    timerStart();
    if (!websiteGenerate(site, writePageToFile, NULL, err)) {
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    double secsElapsed = timerGetTime();
    double roundSecs = round(secsElapsed);
    const char *tmpl = "Generated %d pages to '%sout' in %.6f secs.";
    size_t messageLen = strlen(tmpl) - strlen("%d%s%.6f") +
                        (log10(site->siteGraph.pages.size) + 1) +
                        strlen(site->rootDir) +
                        (roundSecs > 0.1 ? log10(roundSecs) + 1: 1) + 6 +
                        1;
    char *ret = ALLOCATE_ARR_NO_COUNT(char, messageLen);
    snprintf(ret, messageLen, tmpl, site->siteGraph.pages.size, site->rootDir,
             secsElapsed);
    *response = MHD_create_response_from_buffer(strlen(ret), ret,
                                                MHD_RESPMEM_MUST_FREE);
    MHD_add_response_header(*response, "Content-Type", "text/html");
    return MHD_HTTP_OK;
}

static void makeCurrentPageDataJson(SiteGraph *siteGraph, VTree *vTree,
                                    void *dukCtx, void *myPtr, char *err) {
    const char **pt = myPtr;
    *pt = websiteScriptBindingsStrinfigyStashedPageData(dukCtx, -1, err);
}

/*
 * Injects a string into *ptrToHtml:
 *
 * Before: <html><body>
 *     <p>Hello</p>
 * </html>
 *
 * After: <html><body>
 *     <iframe ...></iframe>
 *     <script>...function getCurrentPageData() { return <pageDataJson>; }...</script>
 *     <p>Hello</p>
 * </html>
 */
static void
injectCPanelIframeAndCurrentPageData(char **ptrToHtml, const char *pageDataJson) {
    const char *a = "<iframe src=\"/frontend/cpanel.html\" id=\"insn-cpanel-iframe\" style=\"position:fixed;border:none;height:100%;width:200px;right:4px;top:4px;\"></iframe><script>function setIframeVisible(setVisible) { document.getElementById('insn-cpanel-iframe').style.width = setVisible ? '80%' : '200px'; } function getCurrentPageData() { return ";
    const char *c = "; }</script>";
    char *html = *ptrToHtml;
    const size_t lenA = strlen(a);
    const size_t lenB = pageDataJson ? strlen(pageDataJson) : 2; // 2 == '[' and ']'
    const size_t lenC = strlen(c);
    const size_t injlen = lenA + lenB + lenC;
    const size_t oldLen = strlen(html) + 1;
    char *tmp = ARRAY_GROW(html, char, oldLen, oldLen + injlen);
    char *startOfBody = strstr(tmp, "<body>");
    if (startOfBody && startOfBody != html) {
        startOfBody += strlen("<body>");
    } else {
        printToStdErr("Warn: failed to injectCPanelIframe().\n");
        FREE_ARR(char, tmp, oldLen + injlen);
        return;
    }
    // Inserts <html><body>?|?|?...</body>
    memmove(startOfBody + injlen, startOfBody, strlen(startOfBody) + 1);
    // Replaces <body>?|?|?... -> <body>$a|?|?...
    memcpy(startOfBody, a, lenA);
    startOfBody += lenA;
    // Replaces <body>$a|?|?... -> <body>$a|$b|?...
    if (pageDataJson) {
        memcpy(startOfBody, pageDataJson, lenB);
    } else {
        memcpy(startOfBody, (char[2]){'[', ']'}, lenB);
    }
    startOfBody += lenB;
    // Replaces <body>$a|$b|?... -> <body>$a|$b|$c...
    memcpy(startOfBody, c, lenC);
    *ptrToHtml = tmp;
}
