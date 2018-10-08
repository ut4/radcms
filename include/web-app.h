#ifndef insn_webApp_h
#define insn_webApp_h

#include "file-io.h" // fileIO*()
#include "common.h" // stdbool etc.
#include "memory.h" // ALLOCATE etc.
#include "site-ini.h" // SiteIni etc.

typedef struct {
    char *rootDir; // Normalized, always ends with "/"
    SiteIni ini;
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

#endif