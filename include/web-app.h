#ifndef insn_webApp_h
#define insn_webApp_h

#include "file-io.h" // fileIO*()
#include "common.h" // stdbool etc.
#include "memory.h" // ALLOCATE etc.
#include "site-ini.h" // SiteIni etc.
#include "web-app-common.h" // handlerFn, microhttpd etc.
#include "web/website.h" // websiteHandlersHandle*()

typedef struct {
    char *rootDir; // Normalized, always ends with "/"
    SiteIni ini;
    struct MHD_Daemon *daemon;
    unsigned handlerCount;
    RequestHandler handlers[1];
} WebApp;

void
webAppInit(WebApp *this);

void
webAppDestruct(WebApp *this);

/**
 * Reads and validates site.ini under $rootDir-directory. expectExist == true
 * checks that site.ini exists, expectExist == false checks that site.ini does
 * NOT exist.
 */
bool
webAppMakeSiteIni(WebApp *this, const char *rootDir, bool expectExists, char *err);

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