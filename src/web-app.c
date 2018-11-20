#include "../include/web-app.h"

const char *badReqMessage = "<html><title>400 Bad Request</title><body>400 Bad Request</body></html>";
const char *notFoundMessage = "<html><title>404 Not Found</title><body>404 Not Found</body></html>";
const char *internalErrorMessage = "<html><title>500 Internal Server Error</title><body>500 Internal Server Error</body></html>";
const char *notImplementedMessage = "<html><title>501 Not Implemented</title><body>501 Not Implemented</body></html>";

#define FORM_DATA_ITER_BUF_LEN 256
#define MAX_FIELD_KEY_LEN 128
#define MAX_POST_SIZE 500000

// Used on every POST-request.
typedef struct {
    struct MHD_PostProcessor *postProcessor;
    RequestHandler *reqHandler; // borrowed from app->handlers
    unsigned statusCode;
} PerConnInfo;

/**
 * A function that gets triggered on every incoming http-request.
 */
static int
webAppRespond(void *myPtr, struct MHD_Connection *conn, const char *url,
              const char *method, const char *version, const char *uploadData,
              size_t *uploadDataSize, void **regPtr);

/**
 * A function that gets triggered after each http-request.
 */
static void
webAppFinishRequest(void *cls, struct MHD_Connection *conn, void **perConnPtr,
                    enum MHD_RequestTerminationCode rtc);

static int
respond(unsigned statusCode, struct MHD_Connection *conn,
        struct MHD_Response *response);

static unsigned
preparePostRequest(struct MHD_Response **response, struct MHD_Connection *conn,
                   RequestHandler *h, void **perConnPtr);

static unsigned
processPostData(const char *uploadData, size_t *uploadDataSize,
                void **perConnPtr);

static int
iterateFormDataBasic(void *coninfo_cls, enum MHD_ValueKind kind, const char *key,
                     const char *filename, const char *content_type,
                     const char *transfer_encoding, const char *data,
                     uint64_t off, size_t size);

static int
validatePostReqHeaders(void *myPtr, enum MHD_ValueKind kind, const char *key,
                       const char *value);

void
webAppInit(WebApp *this, const char *rootDir, Website *site, char *err) {
    this->rootDir = fileIOGetNormalizedPath(rootDir);
    #define MAX_FILENAME_LEN 40
    if (strlen(this->rootDir) + MAX_FILENAME_LEN > PATH_MAX) {
        putError("Rootdir too long.\n");
        return;
    }
    char cwd[PATH_MAX];
    if (!getcwd(cwd, PATH_MAX)) {
        putError("Failed to getcwd().\n");
        return;
    }
    this->appPath = copyString(cwd);
    siteIniInit(&this->ini);
    this->ini.rootDir = this->rootDir;
    this->daemon = NULL;
    this->site = site;
    this->handlerCount = sizeof(this->handlers) / sizeof(RequestHandler);
    this->errBuf = err;
}

void
webAppFreeProps(WebApp *this) {
    if (this->rootDir) FREE_STR(this->rootDir);
    if (this->appPath) FREE_STR(this->appPath);
    siteIniFreeProps(&this->ini);
    fileWatcherFreeProps(&this->fileWatcher);
    for (unsigned i = 0; i < this->handlerCount; ++i) {
        if (this->handlers[i].formDataHandlers) {
            FREE(FormDataHandlers, this->handlers[i].formDataHandlers);
        }
    }
}

bool
webAppStart(WebApp *this) {
    this->daemon = MHD_start_daemon(
        MHD_USE_AUTO | MHD_USE_INTERNAL_POLLING_THREAD,
        3000,           // Port number
        NULL,           // Before-request callback, can be used to reject requests
        NULL,           // Before-request *myPtr
        &webAppRespond, // Request callback
        (void*)this,    // Request callback *myPtr
        MHD_OPTION_NOTIFY_COMPLETED,
        webAppFinishRequest,
        NULL,
        MHD_OPTION_END
    );
    return this->daemon != NULL;
}

bool
webAppReadOrCreateSiteIni(WebApp *this, const char *contents, char *err) {
    STR_CONCAT(iniFilePath, this->rootDir, "site.ini");
    // Read
    if (strlen(contents) == 0) {
        return siteIniReadAndValidate(&this->ini, iniFilePath, err);
    }
    // Create
    bool exists = fileIOIsWritable(iniFilePath);
    if (exists) {
        putError("%s already exists.\n", iniFilePath);
        return false;
    }
    return fileIOWriteFile(iniFilePath, contents, err);
}

void*
webAppStartFileWatcher(void *myPtr) {
    WebApp *app = (WebApp*)myPtr;
    fileWatcherInit(&app->fileWatcher, websiteHandleFWEvent);
    fileWatcherWatch(&app->fileWatcher, app->rootDir, websiteCheckIsFWFileAcceptable,
                     (void*)app->site, app->errBuf);
    return NULL;
}

void
webAppShutdown(WebApp *this) {
    if (this->daemon) MHD_stop_daemon(this->daemon);
}


static int
webAppRespond(void *myPtr, struct MHD_Connection *conn, const char *url,
              const char *method, const char *version, const char *uploadData,
              size_t *uploadDataSize, void **perConnPtr) {
    struct MHD_Response *response = NULL;
    WebApp *app = (WebApp*)myPtr;
    /*
     * First iteration
     */
    if (!*perConnPtr) {
        unsigned statusCode = MHD_HTTP_NOT_FOUND;
        for (unsigned i = 0; i < app->handlerCount; ++i) {
            RequestHandler *h = &app->handlers[i];
            unsigned ret = h->handlerFn(h->myPtr, NULL, method, url, &response,
                                        app->errBuf);
            // Wasn't the right handler
            if (ret == 0) continue;
            // Was MHD_YES, setup *perConnPtr
            if (ret == 1) {
                ret = preparePostRequest(&response, conn, h, perConnPtr);
                if (ret == MHD_YES) return MHD_YES; // Continue to the second iteration
                // else ret contains MHD_HTTP_<someError>
            } // else was status code and didn't need *perConnPtr
            statusCode = ret;
            break;
        }
        return respond(statusCode, conn, response);
    }
    PerConnInfo *connInfo = (PerConnInfo*)*perConnPtr;
    /*
    * Second iteration of POST -> process the form data and set connInfo->statusCode
    */
    if (connInfo->statusCode == 0) {
        connInfo->statusCode = processPostData(uploadData, uploadDataSize, perConnPtr);
        return MHD_YES;
    }
    /*
    * Last iteration of POST -> respond
    */
    if (connInfo->statusCode > 1) { // had errors
        return respond(connInfo->statusCode, conn, NULL);
    }
    RequestHandler *h = connInfo->reqHandler;
    connInfo->statusCode = h->handlerFn(h->myPtr, h->formDataHandlers->myPtr,
                                        method, url, &response, app->errBuf);
    if (strlen(app->errBuf) > 0) {
        printToStdErr("Error in handler: %s\n", app->errBuf);
        app->errBuf[0] = '\0';
    }
    return respond(connInfo->statusCode, conn, response);
}

static void
webAppFinishRequest(void *cls, struct MHD_Connection *conn, void **perConnMyPtr,
                    enum MHD_RequestTerminationCode rtc) {
    PerConnInfo *connInfo = *perConnMyPtr;
    if (!connInfo) return;
    (void)MHD_destroy_post_processor(connInfo->postProcessor);
    if (connInfo->reqHandler->formDataHandlers->myPtr) {
        connInfo->reqHandler->formDataHandlers->formDataFreeFn(
            connInfo->reqHandler->formDataHandlers->myPtr);
    }
    FREE(PerConnInfo, connInfo);
    *perConnMyPtr = NULL;
}

static int
respond(unsigned statusCode, struct MHD_Connection *conn,
        struct MHD_Response *response) {
    if (!response) {
        if (statusCode == MHD_HTTP_NOT_FOUND) {
            response = MHD_create_response_from_buffer(strlen(notFoundMessage),
                                                       (void*)notFoundMessage,
                                                       MHD_RESPMEM_PERSISTENT);
        } else if (statusCode == MHD_HTTP_BAD_REQUEST) {
            response = MHD_create_response_from_buffer(strlen(badReqMessage),
                                                       (void*)badReqMessage,
                                                       MHD_RESPMEM_PERSISTENT);
        } else {
            statusCode = MHD_HTTP_INTERNAL_SERVER_ERROR;
            response = MHD_create_response_from_buffer(strlen(internalErrorMessage),
                                                    (void*)internalErrorMessage,
                                                    MHD_RESPMEM_PERSISTENT);
        }
    }
    int success = MHD_queue_response(conn, statusCode, response);
    MHD_destroy_response(response);
    return success;
}

static unsigned
preparePostRequest(struct MHD_Response **response, struct MHD_Connection *conn,
                   RequestHandler *h, void **perConnPtr) {
    if (!h->formDataHandlers) {
        *response = MHD_create_response_from_buffer(
            strlen(notImplementedMessage), (void*)notImplementedMessage,
            MHD_RESPMEM_PERSISTENT);
        return MHD_HTTP_NOT_IMPLEMENTED;
    }
    //
    bool hasRightContentType = false;
    MHD_get_connection_values(conn, MHD_HEADER_KIND, validatePostReqHeaders,
                              (void*)&hasRightContentType);
    if (!hasRightContentType) return MHD_HTTP_BAD_REQUEST;
    //
    PerConnInfo *connInfo = ALLOCATE(PerConnInfo);
    if (!connInfo) {
        printToStdErr("preparePostRequest: Failed to ALLOCATE(PerConnInfo).\n");
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    connInfo->reqHandler = h;
    connInfo->postProcessor = MHD_create_post_processor(
        conn, FORM_DATA_ITER_BUF_LEN, iterateFormDataBasic,
        (void*)h->formDataHandlers);
    if (!connInfo->postProcessor) {
        printToStdErr("preparePostRequest: Failed to MHD_create_post_processor().\n");
        FREE(PerConnInfo, connInfo);
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    connInfo->statusCode = 0;
    *perConnPtr = (void*)connInfo;
    return MHD_YES;
}

static unsigned
processPostData(const char *uploadData, size_t *uploadDataSize,
                void **perConnPtr) {
    if (*uploadDataSize == 0 ||
        *uploadDataSize > MAX_POST_SIZE) return MHD_HTTP_BAD_REQUEST;
    //
    PerConnInfo *connInfo = (PerConnInfo*)*perConnPtr;
    FormDataHandlers *formHandlers = connInfo->reqHandler->formDataHandlers;
    formHandlers->myPtr = formHandlers->formDataInitFn();
    if (!formHandlers->myPtr) {
        printToStdErr("preparePostRequest: formDataInitFn returned nullPtr.\n");
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    //
    (void)MHD_post_process(connInfo->postProcessor, uploadData, *uploadDataSize);
    *uploadDataSize = 0;
    return MHD_YES;
}

static int
iterateFormDataBasic(void *myPPPtr, enum MHD_ValueKind kind, const char *key,
                     const char *filename, const char *contentType,
                     const char *transferEncoding, const char *data,
                     uint64_t off, size_t size) {
    if (size == 0) return MHD_NO;
    if (size <= MAX_FIELD_KEY_LEN) {
        FormDataHandlers *h = (FormDataHandlers*)myPPPtr;
        return (int)h->formDataReceiverFn(key, data, h->myPtr);
    }
    printToStdErr("POST|PUT key length ouf or range (max %u, is %lu), ignoring.\n",
                  MAX_FIELD_KEY_LEN, size);
    return MHD_YES;
}

static int
validatePostReqHeaders(void *myPtr, enum MHD_ValueKind kind, const char *key,
                       const char *value) {
    if (strcmp(key, "Content-Type") == 0) {
        if (strcmp(value, "application/x-www-form-urlencoded") == 0) {
            *((bool*)myPtr) = true;
        }
        return MHD_NO;
    }
    return MHD_YES; // Keep processing
}
