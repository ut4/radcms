#pragma once

#include <array>
#include <cstring>
#include <iostream>
#if defined(INSN_IS_WIN)
#include <winsock2.h>
#elif defined(INSN_IS_LINUX)
#include <sys/select.h>
#endif
#include <microhttpd.h>
#include "app-context.hpp"
#include "my-fs.hpp"

/**
 * A function that handles a single http-request, or passes it to the next
 * handler.
 *
 * @returns {unsigned} MHD_NO | 0      == pass,
 *                     MHD_YES | 1     == accept, continue to the data processing,
 *                     MHD_HTTP_* | >1 == accept, respond immediately
 */
typedef unsigned (*routeHandleFn)(void *myPtr, void *myDataPtr, const char *method,
                                  const char *url, struct MHD_Connection *conn,
                                  struct MHD_Response **response, std::string &err);

/**
 * A function that receives each key & val of POST|PUT-data.
 *
 * @returns {bool} true == continue iterating,
 *                 false == abort the iteration
 */
typedef bool (*receiveFormFieldFn)(const char *key, const char *value,
                                   void *myPtr);

/**
 * A function that creates *myPtr for receiveFormFieldFn().
 */
typedef void* (*makeMyFormDataPtrFn)();

/**
 * Destructor for makeMyFormDataPtrFn()'s ptr
 */
typedef void (*freeMyFormDataPtrFn)(void *myPtr);

struct FormDataHandlers {
    receiveFormFieldFn formDataReceiverFn;
    makeMyFormDataPtrFn formDataInitFn;
    freeMyFormDataPtrFn formDataFreeFn;
    void *myPtr;
};

/**
 * Stores a route, see webApp.handlers at main.cpp @handleRun().
 */
struct RequestHandler {
    routeHandleFn handlerFn; // A function that processes this request
    void *myPtr;             // A value that gets passed to handerFn()
    FormDataHandlers *formDataHandlers;
};

class WebApp {
public:
    AppContext cfg;
    struct MHD_Daemon *daemon = nullptr;
    std::array<RequestHandler, 2> handlers;
    /**
     * Fills in $this->cfg.
     */
    bool
    init(const char *sitePath);
    /**
     * Allocates and starts a microhttpd-server.
     */
    bool
    run();
    /**
     * Closes and frees the microhttpd-server.
     */
    ~WebApp();
};
