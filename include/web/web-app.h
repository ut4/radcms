#ifndef insn_webApp_h
#define insn_webApp_h

#include <unistd.h> // getcwd
#include "../file-io.h" // fileIO*()
#include "../common/common.h" // stdbool etc.
#include "../duk.h" // dukUtilsCompileAndRunStrGlobal()
#include "../common/events.h" // eventsInit()
#include "../common/memory.h" // ALLOCATE etc.
#include "../site-ini.h" // SiteIni etc.
#include "web-app-common.h" // handlerFn, microhttpd etc.
#include "../website.h" // Website
#include "../website-fw-handlers.h" // file-watcher.h

typedef struct {
    char *sitePath; // Normalized, always ends with "/"
    char *appPath;
    SiteIni ini;
    FileWatcher fileWatcher;
    struct MHD_Daemon *daemon;
    Website *site;
    unsigned handlerCount;
    char *errBuf;
    RequestHandler handlers[6];
} WebApp;

void
webAppInit(WebApp *this, const char *sitePath, Website *site, char *err);

void
webAppFreeProps(WebApp *this);

bool
webAppExecModuleScripts(WebApp *this, const char* fileNames[],
                        unsigned numFiles, duk_context *ctx, char *err);

/**
 * Allocates and starts a microhttpd-server.
 */
bool
webAppStart(WebApp *this);

/**
 * strlen(contents) == 0 -> read, strlen(contents) > 0 -> create.
 */
bool
webAppReadOrCreateSiteIni(WebApp *this, const char *contents, char *err);

void*
webAppStartFileWatcher(void *myPtr);

/**
 * Closes and frees the microhttpd-server.
 */
void
webAppShutdown(WebApp *this);

#endif