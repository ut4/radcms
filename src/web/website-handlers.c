#include <fcntl.h> // O_RDONLY
#include "../../include/web/website-handlers.h"

static void injectCPanelIframe(char **html);

unsigned
websiteHandlersHandlePageRequest(void *myPtr, void *myDataPtr, const char *method,
                                 const char *url, struct MHD_Response **response,
                                 char *err) {
    if (strcmp(method, "GET") != 0) return MHD_HTTP_NOT_FOUND;
    Website *site = (Website*)myPtr;
    Page *p = siteGraphFindPage(&site->siteGraph, (char*)url);
    if (!p) {
        return MHD_HTTP_NOT_FOUND;
    }
    char *renderedHtml = pageRender(site, p->layoutIdx, url, NULL, NULL, err);
    if (renderedHtml) {
        injectCPanelIframe(&renderedHtml);
    } else {
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
#ifdef DEBUG_COUNT_ALLOC
    // freed by microhttpd
    memoryAddToByteCount(-(strlen(renderedHtml) + 1));
#endif
    *response = MHD_create_response_from_buffer(strlen(renderedHtml),
                                                (void*)renderedHtml,
                                                MHD_RESPMEM_MUST_FREE);
    return MHD_HTTP_OK;
}

unsigned
websiteHandlersHandleStaticFileRequest(void *myPtr, void *myDataPtr, const char *method,
                                       const char *url, struct MHD_Response **response,
                                       char *err) {
    if (strcmp(method, "GET") != 0 || strstr(url, "/frontend/") != url) return 0;
    if (strstr(url, "..")) return MHD_HTTP_NOT_FOUND;
    char *ext = strrchr(url, '.');
    if (!ext) return MHD_HTTP_NOT_FOUND;
    bool isJs = strcmp(ext, ".js") == 0;
    if (!isJs && strcmp(ext, ".html") != 0) {
        return MHD_HTTP_NOT_FOUND;
    }
    int fd;
    struct stat sbuf;
    char *appPath = (char*)myPtr;
    STR_CONCAT(path, appPath, url);
    if ((fd = open(path, O_RDONLY)) == -1 || fstat(fd, &sbuf) != 0) {
        if (fd != -1) (void)close(fd);
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    *response = MHD_create_response_from_fd_at_offset64(sbuf.st_size, fd, 0);
    MHD_add_response_header(*response, "Content-Type", isJs?"application/javascript":"text/html");
    MHD_add_response_header(*response, "Cache-Control", "public,max-age=86400");//24h
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
                                     const char *url, struct MHD_Response **response,
                                     char *err) {
    if (strcmp(method, "GET") != 0 || strcmp(url, "/api/website/generate") != 0) return 0;
    Website *site = (Website*)myPtr;
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
    char *ret = ALLOCATE_ARR(char, messageLen);
    snprintf(ret, messageLen, tmpl, site->siteGraph.pages.size, site->rootDir,
             secsElapsed);
#ifdef DEBUG_COUNT_ALLOC
    memoryAddToByteCount(-(messageLen));
#endif
    *response = MHD_create_response_from_buffer(strlen(ret),
                                                (void*)ret,
                                                MHD_RESPMEM_MUST_FREE);
    return MHD_HTTP_OK;
}

static void
injectCPanelIframe(char **ptrToHtml) {
    const char *injection = "<iframe src=\"/frontend/cpanel.html\" style=\"position:fixed;border:none;height:100%;width:120px;right:0;top:0;\"></iframe>";
    char *html = *ptrToHtml;
    const size_t injlen = strlen(injection);
    const size_t oldLen = strlen(html);
    char *tmp = ARRAY_GROW(html, char, oldLen + 1, oldLen + injlen + 1);
    char *startOfBody = strstr(tmp, "<body>");
    if (startOfBody && startOfBody != html) {
        startOfBody += strlen("<body>");
    } else {
        printToStdErr("Warn: failed to injectCPanelIframe().\n");
        FREE_ARR(char, tmp, oldLen + injlen + 1);
        return;
    }
    // Appends <html><body>__ROOMFORINJECTION__abcd</body>
    memmove(startOfBody + injlen, startOfBody, strlen(startOfBody) + 1);
    // Replaces __ROOMFORINJECTION__
    memcpy(startOfBody, injection, injlen);
    *ptrToHtml = tmp;
}
