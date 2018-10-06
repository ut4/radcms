#include "../include/web.h"

const char *notFoundMessage = "<html><title>404 Not Found</title><body>404 Not Found</body></html>";
const char *internalErrorMessage = "<html><title>500 Internal Server Error</title><body>500 Internal Server Error</body></html>";
const char *cpanelContent = "<html><body>Hello</body></html>";

char *tempHack;

App app = {
    .rootDir = NULL,
    .daemon = NULL,
    .getHandlers = {{"/api/components", componentGetAll, NULL}},
    .putHandlers = {{NULL, componentUpdate, componentIsPutUrl}},
};

void
appInit(const char *rootDir, char *tempHackk) {
    app.rootDir = rootDir;
    tempHack = tempHackk;
}

bool
appStart() {
    if (strlen(app.rootDir) == 0) {
        return false;
    }
    app.daemon = MHD_start_daemon(
        MHD_USE_INTERNAL_POLLING_THREAD|MHD_OPTION_STRICT_FOR_CLIENT, 3000,
        NULL, NULL, &appRespond, NULL, MHD_OPTION_END
    );
    return app.daemon != NULL;
}

void
appShutdown() {
    MHD_stop_daemon(app.daemon);
}

static handlerFn getHandler(const char *url, const char *method) {
    HandlerDef *handlers;
    int l;
    if (strcmp(method, "GET") == 0) {
        handlers = app.getHandlers;
        l = sizeof(app.getHandlers) / sizeof(app.getHandlers[0]);
    } else if (strcmp(method, "PUT") == 0) {
        handlers = app.putHandlers;
        l = sizeof(app.putHandlers) / sizeof(app.putHandlers[0]);
    } else {
        return NULL;
    }
    for (int i = 0; i < l; ++i) {
        HandlerDef *handler = &handlers[i];
        if (!handler->macher && strcmp(url, handler->url) == 0) {
            return handler->fn;
        } else if (handler->macher && handler->macher(url)) {
            return handler->fn;
        }
    }
    return NULL;
}

int
appRespond(void *cls, struct MHD_Connection *connection, const char *url,
           const char *method, const char *version, const char *uploadData,
           size_t *uploadDataSize, void **myPtr) {
    struct MHD_Response *response = NULL;
    unsigned statusCode = MHD_HTTP_OK;
    int ret;
    bool isGet = strcmp(method, "GET") == 0;
    if (strstr(url, "/api/") == url) {
        handlerFn fn = getHandler(url, method);
        if (fn) {
            statusCode = fn(&response);
        }
    } else if (isGet && strcmp(url, "/") == 0) {
        response = MHD_create_response_from_buffer(strlen(tempHack),
                                                   (void*)tempHack,
                                                   MHD_RESPMEM_PERSISTENT);
    } else if (isGet && strcmp(url, "/int/cpanel") == 0) {
        response = MHD_create_response_from_buffer(strlen(cpanelContent),
                                                   (void*)cpanelContent,
                                                   MHD_RESPMEM_PERSISTENT);
    } else {
        response = MHD_create_response_from_buffer(strlen(notFoundMessage),
                                                   (void*)notFoundMessage,
                                                   MHD_RESPMEM_PERSISTENT);
        statusCode = MHD_HTTP_NOT_FOUND;
    }
    if (!response) {
        response = MHD_create_response_from_buffer(strlen(internalErrorMessage),
                                                   (void*)internalErrorMessage,
                                                   MHD_RESPMEM_PERSISTENT);
        statusCode = MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    if (!response) {
        return MHD_NO;
    }
    ret = MHD_queue_response(connection, statusCode, response);
    MHD_destroy_response(response);
    return ret;
}
