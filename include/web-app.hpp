#pragma once

#include <array>
#include <cstring>
#include <iostream>
#include <unistd.h> // getcwd
#if defined(INSN_IS_WIN)
#include <winsock2.h>
#elif defined(INSN_IS_LINUX)
#include <sys/select.h>
#endif
#include <microhttpd.h>
#include "app-context.hpp"
#include "my-fs.hpp"

struct FormDataHandlers {
    void (*init)(void **myPtr);
    bool (*receiveVal)(const char *key, const char *value, void *myPtr); // return false == break
    void (*cleanup)(void *myPtr);
    void *myPtr;
};

struct RequestHandler {
    /**
     * @returns {unsigned} MHD_NO | 0      == pass,
     *                     MHD_YES | 1     == accept and continue to the data processing,
     *                     MHD_HTTP_* | >1 == accept and respond immediately
     */
    unsigned (*handlerFn)(void *myPtr, void *myDataPtr, const char *method,
                          const char *url, struct MHD_Connection *conn,
                          struct MHD_Response **response, std::string &err);
    void *myPtr = nullptr; // A value that gets passed to handerFn()
    FormDataHandlers *formDataHandlers = nullptr;
};

class WebApp {
public:
    AppContext ctx;
    struct MHD_Daemon *daemon = nullptr;
    std::array<RequestHandler, 2> handlers;
    /**
     * Fills in $this->ctx.
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
