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
    const char *pageDataJson = NULL;
    char *renderedHtml = pageRender(site, p->layoutIdx, url,
                                    makeCurrentPageDataJson, &pageDataJson,
                                    NULL, err);
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
    timerInit();
    timerStart();
    StrTube issues = strTubeMake();
    Website *site = myPtr;
    cJSON *json;
    unsigned statusCode = MHD_HTTP_INTERNAL_SERVER_ERROR;
    unsigned succefulWrites = websiteGenerate(site, writePageToFile, NULL,
                                              &issues, err);
    if (succefulWrites == 0) {
        goto done;
    }
    double secsElapsed = timerGetTime();
    json = cJSON_CreateObject();
    cJSON *issuesJson;
    if (!json ||
        !(issuesJson = cJSON_AddArrayToObject(json, "issues")) ||
        !cJSON_AddStringToObject(json, "targetRoot", site->rootDir) ||
        !cJSON_AddStringToObject(json, "targetDir", "out") ||
        !cJSON_AddNumberToObject(json, "wrotePagesNum", succefulWrites) ||
        !cJSON_AddNumberToObject(json, "tookSecs", secsElapsed) ||
        !cJSON_AddNumberToObject(json, "totalPages", site->siteGraph.pages.size)) {
        putError("Failed to build a json reponse.\n");
        goto done;
    }
    StrTubeReader reader = strTubeReaderMake(&issues);
    char *issueInfo = NULL;
    while ((issueInfo = strTubeReaderNext(&reader))) {
        cJSON *error = cJSON_CreateString(issueInfo);
        if (!error) { putError("Failed to cJSON_CreateString()\n"); goto done; }
        cJSON_AddItemToArray(issuesJson, error);
    }
    char *res = cJSON_PrintUnformatted(json);
    if (res) statusCode = MHD_HTTP_OK;
    //
    done:
    if (statusCode == MHD_HTTP_OK) {
        *response = MHD_create_response_from_buffer(strlen(res), res,
                                                    MHD_RESPMEM_MUST_FREE);
        MHD_add_response_header(*response, "Content-Type", "application/json");
    }
    strTubeFreeProps(&issues);
    if (json) cJSON_Delete(json);
    return statusCode;
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
    STR_APPEND(startOfBody, a, lenA);
    // Replaces <body>$a|?|?... -> <body>$a|$b|?...
    STR_APPEND(startOfBody, pageDataJson ? pageDataJson : "[]", lenB);
    // Replaces <body>$a|$b|?... -> <body>$a|$b|$c...
    STR_APPEND(startOfBody, c, lenC);
    *ptrToHtml = tmp;
}
