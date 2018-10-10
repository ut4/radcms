#ifndef insn_webAppCommon_h
#define insn_webAppCommon_h

#include <sys/stat.h> // fstat
#include <fcntl.h> // O_RDONLY
#if defined(_WIN32) && !defined(__CYGWIN__)
#include <winsock2.h>
#else
#include <sys/select.h>
#endif
#include <microhttpd.h>

/**
 * A function that handles a single http-request. Returns a status code eg.
 * MHD_HTTP_OK.
 */
typedef unsigned (*handlerFn)(void* this, const char *method, const char *url,
                              struct MHD_Response **response);

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