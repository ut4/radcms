#include "../include/web-app.h"

const char *notFoundMessage = "<html><title>404 Not Found</title><body>404 Not Found</body></html>";
const char *internalErrorMessage = "<html><title>500 Internal Server Error</title><body>500 Internal Server Error</body></html>";

/**
 * A function that gets triggered on every incoming http-request. Tries to dispatch
 * the request to a handler, or returns 404 if no handler was found.
 */
static int
webAppRespond(void *myPtr, struct MHD_Connection *connection, const char *url,
              const char *method, const char *version, const char *uploadData,
              size_t *uploadDataSize, void **regPtr);

/**
 * Returns a handler for $method + $url, or NULL is no handler was found.
 */
static RequestHandler*
getHandler(WebApp *app, const char *method, const char *url);

void
webAppInit(WebApp *this, char *errBuf) {
    siteIniInit(&this->ini);
    this->handlerCount = sizeof(this->handlers) / sizeof(RequestHandler);
    this->errBuf = errBuf;
}

void
webAppDestruct(WebApp *this) {
    if (this->rootDir) FREE_STR(this->rootDir);
    siteIniDestruct(&this->ini);
}

bool
webAppStart(WebApp *this) {
    this->daemon = MHD_start_daemon(
        MHD_USE_INTERNAL_POLLING_THREAD | MHD_USE_AUTO | MHD_OPTION_STRICT_FOR_CLIENT,
        3000,           // Port number
        NULL,           // Before-request callback, can be used to reject requests
        NULL,           // Before-request *myPtr
        &webAppRespond, // Request callback
        (void*)this,    // Request callback *myPtr
        MHD_OPTION_END
    );
    return this->daemon != NULL;
}

void
webAppShutdown(WebApp *this) {
    MHD_stop_daemon(this->daemon);
}

static int
webAppRespond(void *myPtr, struct MHD_Connection *connection, const char *url,
              const char *method, const char *version, const char *uploadData,
              size_t *uploadDataSize, void **regPtr) {
    struct MHD_Response *response = NULL;
    unsigned statusCode = MHD_HTTP_OK;
    WebApp *app = (WebApp*)myPtr;
    RequestHandler *h = getHandler(app, method, url);
    if (h) {
        statusCode = h->handlerFn(h->this, method, url, &response, app->errBuf);
    }
    if (strlen(app->errBuf) > 0) {
        printToStdErr("Error in handler: '%s'", app->errBuf);
        app->errBuf[0] = '\0';
    }
    if (!h || statusCode == MHD_HTTP_NOT_FOUND) {
        response = MHD_create_response_from_buffer(strlen(notFoundMessage),
                                                   (void*)notFoundMessage,
                                                   MHD_RESPMEM_PERSISTENT);
        statusCode = MHD_HTTP_NOT_FOUND;
    }
    if (!response || statusCode == MHD_HTTP_INTERNAL_SERVER_ERROR) {
        response = MHD_create_response_from_buffer(strlen(internalErrorMessage),
                                                   (void*)internalErrorMessage,
                                                   MHD_RESPMEM_PERSISTENT);
        statusCode = MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    if (!response) {
        return MHD_NO;
    }
    int success = MHD_queue_response(connection, statusCode, response);
    MHD_destroy_response(response);
    return success;
}

bool
webAppMakeSiteIni(WebApp *this, const char *rootDir, bool expectExists, char *err) {
    // 1. Normalize $rootDir
    size_t l1 = strlen(rootDir) + 1;
    if (rootDir[l1 - 2] != '/') { // add trailing /
        this->rootDir = ALLOCATE_ARR(char, l1 + 1);
        snprintf(this->rootDir, l1 + 1, "%s%c", rootDir, '/');
    } else {
        this->rootDir = copyString(rootDir);
    }
    // 2. Check site.ini
    this->ini.rootDir = this->rootDir;
    STR_CONCAT(iniFilePath, this->rootDir, "site.ini");
    if (expectExists) {
        return siteIniReadAndValidate(&this->ini, iniFilePath, err);
    } else {
        return !fileIOIsWritable(iniFilePath);
    }
}

static RequestHandler*
getHandler(WebApp *app, const char *method, const char *url) {
    for (unsigned i = 0; i < app->handlerCount; ++i) {
        RequestHandler *h = &app->handlers[i];
        if (strcmp(h->methodPattern, method) != 0) continue;
        if (strcmp(h->urlPattern, url) == 0 ||
            strcmp(h->urlPattern, "/*") == 0) {
            return h;
        }
    }
    return NULL;
}