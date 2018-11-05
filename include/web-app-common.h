#ifndef insn_webAppCommon_h
#define insn_webAppCommon_h

#if defined(INSN_IS_WIN)
#include <winsock2.h>
#elif defined(INSN_IS_LINUX)
#include <sys/select.h>
#endif
#include <microhttpd.h>

/**
 * A function that handles a single http-request. Returns a status code eg.
 * MHD_HTTP_OK.
 */
typedef unsigned (*handlerFn)(void* this, const char *method, const char *url,
                              struct MHD_Response **response, char *err);

/**
 * Stores a route, see main.c (app.handlers).
 */
typedef struct {
    const char *methodPattern; // HTTP-method to match eg. "GET", "POST"
    const char *urlPattern;    // url to match eg. "/home"
    handlerFn handlerFn;       // A function that processes this request
    void *this;                // A value that gets passed to handerFn()
} RequestHandler;

#endif