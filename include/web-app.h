#ifndef insn_webApp_h
#define insn_webApp_h

#include "file-io.h" // fileIO*()
#include "common.h" // stdbool etc.
#include "memory.h" // ALLOCATE etc.
#include "site-ini.h" // SiteIni etc.
#include "web-app-common.h" // handlerFn, microhttpd etc.
#include "web/website-handlers.h" // websiteHandlersHandle*()

typedef struct {
    char *rootDir; // Normalized, always ends with "/"
    SiteIni ini;
    struct MHD_Daemon *daemon;
    unsigned handlerCount;
    char *errBuf;
    RequestHandler handlers[3];
} WebApp;

void
webAppInit(WebApp *this, const char *rootDir, char *errBuf);

void
webAppFreeProps(WebApp *this);

/**
 * strlen(contents) == 0 -> read, strlen(contents) > 0 -> create.
 */
bool
webAppReadOrCreateSiteIni(WebApp *this, const char *contents, char *err);

/**
 * Allocates and starts a microhttpd-server.
 */
bool
webAppStart(WebApp *this);

/**
 * Closes and frees the microhttpd-server.
 */
void
webAppShutdown(WebApp *this);

#endif