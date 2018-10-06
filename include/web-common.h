#ifndef rad3_webCommon_h
#define rad3_webCommon_h

#include <stdio.h>
#include <stdbool.h>
#include <sys/stat.h> // fstat
#include <fcntl.h> // O_RDONLY
#if defined(_WIN32) && !defined(__CYGWIN__)
#include <winsock2.h>
#else
#include <sys/select.h>
#endif
#include <microhttpd.h>

typedef unsigned int (*handlerFn)(struct MHD_Response **res);
typedef bool (*handlerMatcherFn)(const char *url);

typedef struct {
    const char *url;
    handlerFn fn;
    handlerMatcherFn macher;
} HandlerDef;

void
readFileAndMakeRes(struct MHD_Response** response, const char *rootDir,
                   const char *tmplFileName);

#endif