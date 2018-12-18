#include "../../include/web/website-handlers.h"

static bool writePageToFile(char *renderedHtml, Page *page, Website *site,
                            void *myPtr, char *err);
static void makeCurrentPageDataJson(SiteGraph *siteGraph, VTree *vTree,
                                    void *dukCtx, void *myPtr, char *err);
static void injectCPanelIframeAndCurrentPageData(char **html,
                                                 const char *pageDataJson);
static int uploadFileFtp(UploadState *state, char *renderedHtml, Page *page);
static void finalizeUploadReq(void *cls);
static bool receiveUploadFormField(const char *key, const char *value, void *myPtr);
static void* makeUploadFormData();
static void freeUploadFormData(void *myPtr);

const char *alreadyUploadingMessage = "The upload process has already started.";
static bool uploadHandlerIsBusy = false;

unsigned
websiteHandlersHandlePageRequest(void *myPtr, void *myDataPtr, const char *method,
                                 const char *url, struct MHD_Connection *conn,
                                 struct MHD_Response **response, char *err) {
    // Since this is always the last handler, return 404 instead of MHD_NO
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

static bool
storeRenderedPage(char *renderedHtml, Page *page, Website *site, void *myPtr,
                char *err) {
    strTubePush(myPtr, renderedHtml);
    return true;
}

unsigned
websiteHandlersHandleUploadRequest(void *myPtr, void *myDataPtr, const char *method,
                                   const char *url, struct MHD_Connection *conn,
                                   struct MHD_Response **response, char *err) {
    // First/matcher call -> return 1 if matches, 0 otherwise
    if (!myDataPtr) {
        return (unsigned)(strcmp(method, "POST") == 0 && strcmp(url, "/api/website/upload") == 0);
    }
    // Second/actual call, myDataPtr is now filled -> handle the request
    if (uploadHandlerIsBusy) {
        *response = MHD_create_response_from_buffer(strlen(alreadyUploadingMessage),
                                                    (void*)alreadyUploadingMessage,
                                                    MHD_RESPMEM_PERSISTENT);
        MHD_add_response_header(*response, "Content-Type", "text/html");
        return MHD_HTTP_CONFLICT;
    }
    void *curl = curl_easy_init();
    if (!curl) {
        putError("Failed to curl_easy_init()\n.");
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    uploadHandlerIsBusy = true;
    /*
     * Render all pages.
     */
    StrTube *htmls = ALLOCATE(StrTube);
    strTubeInit(htmls);
    StrTube issues = strTubeMake();
    Website *site = myPtr;
    if (websiteGenerate(site, storeRenderedPage, htmls, &issues,
                        site->errBuf) == 0 || issues.length > 0) {
        printToStdErr("%u pages had issues, returning BAD_REQUEST\n", issues.length);
        strTubeFreeProps(htmls);
        FREE(StrTube, htmls);
        strTubeFreeProps(&issues);
        return MHD_HTTP_BAD_REQUEST;
    }
    strTubeFreeProps(&issues);
    /*
     * Make UploadState
     */
    UploadState *state = ALLOCATE(UploadState);
    state->nthPage = 1;
    state->totalIncomingPages = htmls->length;
    state->hadStopError = false;
    state->formData = myDataPtr;
    state->renderOutputReader = ALLOCATE(StrTubeReader);
    state->uploadImplFn = uploadFileFtp;
    strTubeReaderInit(state->renderOutputReader, htmls);
    state->curPage = site->siteGraph.pages.orderedAccess;
    state->curl = curl;
    /*
     * Upload the pages one by one.
     */
    *response = MHD_create_response_from_callback(MHD_SIZE_UNKNOWN, 512,
                                                  uploadPageAndWriteRespChunk,
                                                  state, &finalizeUploadReq);
    MHD_add_response_header(*response, "Transfer-Encoding", "chunked");
    MHD_add_response_header(*response, "Content-Type", "text/html;charset=utf-8");
    return MHD_HTTP_OK;
}

FormDataHandlers*
websiteHandlersGetUploadDataHandlers() {
    FormDataHandlers *out = ALLOCATE(FormDataHandlers);
    out->formDataReceiverFn = receiveUploadFormField;
    out->formDataInitFn = makeUploadFormData;
    out->formDataFreeFn = freeUploadFormData;
    out->myPtr = NULL;
    return out;
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

static size_t
myCurlPutChunk(void *buf, size_t multiplier, size_t nmemb, void *myPtr) {
    CurlUploadState *state = myPtr;
    size_t max = multiplier * nmemb;
    if (max < 1) return 0;
    if (state->sizeleft) {
        size_t chunkSize = max > state->sizeleft ? state->sizeleft : max;
        memcpy(buf, state->fileContents, chunkSize);
        state->fileContents += chunkSize;
        state->sizeleft -= chunkSize;
        return chunkSize;
    }
    return 0; // no more data left to deliver
}

static int
uploadFileFtp(UploadState *state, char *renderedHtml, Page *page) {
    void *curl = state->curl;
    char fname[strlen(state->formData->remoteUrl) + strlen(page->url) + strlen(".html") + 1];
    sprintf(fname, "%s%s.html", state->formData->remoteUrl,
            strlen(page->url) > 1 ? page->url + 1 : "_"); // '/foo' -> 'foo'
    curl_easy_setopt(curl, CURLOPT_URL, fname);
    curl_easy_setopt(curl, CURLOPT_USERNAME, state->formData->username);
    curl_easy_setopt(curl, CURLOPT_PASSWORD, state->formData->password);
    curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);
    curl_easy_setopt(curl, CURLOPT_READFUNCTION, myCurlPutChunk);
    CurlUploadState ustate = {renderedHtml, strlen(renderedHtml)};
    curl_easy_setopt(curl, CURLOPT_READDATA, &ustate);
    curl_easy_setopt(curl, CURLOPT_INFILESIZE_LARGE, (curl_off_t)ustate.sizeleft);
    CURLcode res = curl_easy_perform(curl);
    curl_easy_reset(curl);
    if (res == CURLE_OK) return UPLOAD_OK;
    printToStdErr("curl_easy_perform() failed: %s.\n",
                    curl_easy_strerror(res));
    if (res == CURLE_LOGIN_DENIED) return UPLOAD_LOGIN_DENIED;
    return res;
}

static void
finalizeUploadReq(void *cls) {
    UploadState *state = cls;
    strTubeFreeProps(state->renderOutputReader->strTube);
    FREE(StrTube, state->renderOutputReader->strTube);
    FREE(StrTubeReader, state->renderOutputReader);
    curl_easy_cleanup(state->curl);
    FREE(UploadState, state);
    uploadHandlerIsBusy = false;
}

static bool
receiveUploadFormField(const char *key, const char *value, void *myPtr) {
    if (strcmp(key, "remoteUrl") == 0) {
        ((UploadFormData*)myPtr)->remoteUrl = copyString(value);
    } else if (strcmp(key, "username") == 0) {
        ((UploadFormData*)myPtr)->username = copyString(value);
    } else if (strcmp(key, "password") == 0) {
        ((UploadFormData*)myPtr)->password = copyString(value);
    }
    return true;
}

static void*
makeUploadFormData() {
    UploadFormData *out = ALLOCATE(UploadFormData);
    out->remoteUrl = NULL;
    out->username = NULL;
    out->password = NULL;
    out->errors = 0;
    return out;
}

static void
freeUploadFormData(void *myPtr) {
    UploadFormData *c = myPtr;
    if (c->remoteUrl) FREE_STR(c->remoteUrl);
    if (c->username) FREE_STR(c->username);
    if (c->password) FREE_STR(c->password);
    FREE(UploadFormData, myPtr);
}
