#include <signal.h>
#include <time.h>
#include "../include/web-app.hpp"

static const char *badReqMessage = "<html><title>400 Bad Request</title><body>400 Bad Request</body></html>";
static const char *notFoundMessage = "<html><title>404 Not Found</title><body>404 Not Found</body></html>";
static const char *internalErrorMessage = "<html><title>500 Internal Server Error</title><body>500 Internal Server Error</body></html>";
static const char *notImplementedMessage = "<html><title>501 Not Implemented</title><body>501 Not Implemented</body></html>";

constexpr int FORM_DATA_ITER_BUF_LEN = 256;
constexpr int MAX_POST_SIZE = 500000;
constexpr int MAX_URL_LEN = 2000;
constexpr int SEND_TMPL_ERRORS_TO_BROWSER = 1;

static volatile int isCtrlCTyped = 0;
static void onCtrlC(int _) { isCtrlCTyped = 1; }

// Used on every POST|PUT-request.
struct PerConnInfo {
    struct MHD_PostProcessor *postProcessor;
    RequestHandler *reqHandler; // borrowed from app->handlers
    unsigned statusCode;
    IncomingDataContentType formDataContentType;
};

static int
handleRequest(void *myPtr, struct MHD_Connection *conn, const char *url,
              const char *method, const char *version, const char *uploadData,
              size_t *uploadDataSize, void **perConnPtr);

static void
finishRequest(void *cls, struct MHD_Connection *conn, void **perConnMyPtr,
              enum MHD_RequestTerminationCode rtc);

static int
respond(unsigned statusCode, struct MHD_Connection *conn,
        struct MHD_Response *response, std::string &err);

static unsigned
preparePostRequest(struct MHD_Response **response, struct MHD_Connection *conn,
                   RequestHandler *h, void **perConnPtr);

static unsigned
processPostData(const char *uploadData, size_t *uploadDataSize,
                void **perConnPtr);

static int
iterateFormDataBasic(void *myPPPtr, enum MHD_ValueKind kind, const char *key,
                     const char *filename, const char *contentType,
                     const char *transferEncoding, const char *data,
                     uint64_t off, size_t size);

static int
getFormDataContentType(void *myPtr, enum MHD_ValueKind kind, const char *key,
                       const char *value);

bool
WebApp::run() {
    //
    this->daemon = MHD_start_daemon(
        MHD_USE_AUTO | MHD_USE_INTERNAL_POLLING_THREAD,
        3000,          // Port number
        nullptr,       // Before-request callback, can be used to reject requests
        nullptr,       // Before-request *myPtr
        handleRequest, // Request callback
        this,          // Request callback *myPtr
        MHD_OPTION_NOTIFY_COMPLETED,
        finishRequest,
        nullptr,
        MHD_OPTION_END
    );
    if (this->daemon) {
        signal(SIGINT, onCtrlC);
        struct timespec t = {0, 80000000L}; // 0 secs, 80 ms
        std::cout << "[Info]: Started server at localhost:3000. Hit Ctrl+C to stop it...\n";
        while (!isCtrlCTyped) nanosleep(&t, nullptr);
        return true;
    }
    this->ctx->errBuf = "Failed to start the server.";
    return false;
}

WebApp::~WebApp() {
    if (this->daemon) MHD_stop_daemon(this->daemon);
    for (auto &h: this->handlers) delete h.formDataHandlers;
}

int
handleRequest(void *myPtr, struct MHD_Connection *conn, const char *url,
              const char *method, const char *version, const char *uploadData,
              size_t *uploadDataSize, void **perConnPtr) {
    struct MHD_Response *response = nullptr;
    auto *app = static_cast<WebApp*>(myPtr);
    if (strlen(url) > MAX_URL_LEN) {
        std::cerr << "[Error]: Url too long (max " << MAX_URL_LEN << ", was " <<
                     strlen(url) << ").";
        return MHD_NO;
    }
    /*
     * First iteration
     */
    if (!*perConnPtr) {
        unsigned statusCode = MHD_HTTP_NOT_FOUND;
        for (RequestHandler &h: app->handlers) {
            unsigned ret = h.handlerFn(h.myPtr, nullptr, method, url, conn,
                                       &response, app->ctx->errBuf);
            // Wasn't the right handler
            if (ret == MHD_NO) continue;
            // Was MHD_YES, setup *perConnPtr
            if (ret == MHD_YES) {
                ret = preparePostRequest(&response, conn, &h, perConnPtr);
                if (ret == MHD_YES) return ret; // Continue to the second iteration
                // else ret contains MHD_HTTP_<someError>
            } // else was status code and didn't need *perConnPtr
            statusCode = ret;
            break;
        }
        return respond(statusCode, conn, response, app->ctx->errBuf);
    }
    auto *connInfo = static_cast<PerConnInfo*>(*perConnPtr);
    /*
     * Second iteration of POST|PUT -> process the form data and set connInfo->statusCode
     */
    if (connInfo->statusCode == 0) {
        connInfo->statusCode = processPostData(uploadData, uploadDataSize, perConnPtr);
        return MHD_YES;
    }
    /*
     * Last iteration of POST|PUT -> respond
     */
    if (connInfo->statusCode > 1) { // had errors
        return respond(connInfo->statusCode, conn, nullptr, app->ctx->errBuf);
    }
    RequestHandler *h = connInfo->reqHandler;
    connInfo->statusCode = h->handlerFn(h->myPtr, h->formDataHandlers->myPtr,
                                        method, url, conn, &response,
                                        app->ctx->errBuf);
    return respond(connInfo->statusCode, conn, response, app->ctx->errBuf);
}

void
finishRequest(void *cls, struct MHD_Connection *conn, void **perConnMyPtr,
                      enum MHD_RequestTerminationCode rtc) {
    auto *connInfo = static_cast<PerConnInfo*>(*perConnMyPtr);
    if (!connInfo) return;
    if (connInfo->formDataContentType == CONTENT_TYPE_URL_ENCODED) {
        (void)MHD_destroy_post_processor(connInfo->postProcessor);
    }
    if (connInfo->reqHandler->formDataHandlers->myPtr) {
        connInfo->reqHandler->formDataHandlers->cleanup(
            connInfo->reqHandler->formDataHandlers->myPtr);
    }
    delete connInfo;
    *perConnMyPtr = NULL;
}

static int
respond(unsigned statusCode, struct MHD_Connection *conn,
        struct MHD_Response *response, std::string &err) {
    if (!err.empty()) {
        if (SEND_TMPL_ERRORS_TO_BROWSER) {
            response = MHD_create_response_from_buffer(err.size(),
                                                       (void*)err.c_str(),
                                                       MHD_RESPMEM_MUST_COPY);
        } else {
            std::cerr << "Error in handler: " << err << "\n";
        }
        err.clear();
    } else if (!response) {
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
    IncomingDataContentType ctype = CONTENT_TYPE_OTHER;
    MHD_get_connection_values(conn, MHD_HEADER_KIND, getFormDataContentType,
                              &ctype);
    if (ctype == CONTENT_TYPE_OTHER) {
        std::cerr << "[Error]: Expected Content-Type: \"application/json\" or "
                     "\"application/x-www-form-urlencoded\".\n";
        return MHD_HTTP_BAD_REQUEST;
    }
    //
    PerConnInfo *connInfo = new PerConnInfo;
    connInfo->reqHandler = h;
    connInfo->formDataContentType = ctype;
    connInfo->statusCode = 0;
    if (connInfo->formDataContentType == CONTENT_TYPE_JSON) {
        connInfo->postProcessor = nullptr;
    } else {
        connInfo->postProcessor = MHD_create_post_processor(
            conn, FORM_DATA_ITER_BUF_LEN, iterateFormDataBasic, h->formDataHandlers);
        if (!connInfo->postProcessor) {
            std::cerr << "[Error]: preparePostRequest: Failed to MHD_create_post_processor().\n";
            delete connInfo;
            return MHD_HTTP_INTERNAL_SERVER_ERROR;
        }
    }
    *perConnPtr = connInfo;
    return MHD_YES;
}

static unsigned
processPostData(const char *uploadData, size_t *uploadDataSize,
                void **perConnMyPtr) {
    size_t l = *uploadDataSize;
    if (l == 0) {
        std::cerr << "[Debug]: empty POST|PUT body.\n";
        return MHD_YES;
    }
    if (l > MAX_POST_SIZE) {
        std::cerr << "[Error]: POST|PUT body length out of range (max " <<
                     MAX_POST_SIZE << ", was " << l << ").\n";
        return MHD_HTTP_BAD_REQUEST;
    }
    //
    auto *connInfo = static_cast<PerConnInfo*>(*perConnMyPtr);
    FormDataHandlers *handlers = connInfo->reqHandler->formDataHandlers;
    handlers->init(connInfo->formDataContentType, &handlers->myPtr);
    //
    if (connInfo->formDataContentType == CONTENT_TYPE_JSON) {
        handlers->receiveVal("<json>", uploadData, handlers->myPtr);
    } else {
        (void)MHD_post_process(connInfo->postProcessor, uploadData, l);
    }
    *uploadDataSize = 0;
    return MHD_YES;
}

static int
iterateFormDataBasic(void *myPPPtr, enum MHD_ValueKind kind, const char *key,
                     const char *filename, const char *contentType,
                     const char *transferEncoding, const char *data,
                     uint64_t off, size_t size) {
    if (size == 0) return MHD_NO;
    if (size <= MAX_POST_SIZE) {
        auto *h = static_cast<FormDataHandlers*>(myPPPtr);
        return (int)h->receiveVal(key, data, h->myPtr);
    }
    std::cerr << "[Error]: POST|PUT field too large (max " << MAX_POST_SIZE <<
                 ", is " << size << "), ignoring.\n";
    return MHD_YES;
}

static int
getFormDataContentType(void *myPtr, enum MHD_ValueKind kind, const char *key,
                       const char *value) {
    if (strcmp(key, "Content-Type") == 0) {
        if (strcmp(value, "application/json") == 0) {
            *((IncomingDataContentType*)myPtr) = CONTENT_TYPE_JSON;
        } else if (strcmp(value, "application/x-www-form-urlencoded") == 0) {
            *((IncomingDataContentType*)myPtr) = CONTENT_TYPE_URL_ENCODED;
        }
        return MHD_NO;
    }
    return MHD_YES; // Keep processing
}
