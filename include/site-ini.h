#ifndef insn_siteIni_h
#define insn_siteIni_h

#include <stdbool.h>
#include <ini.h> // ini_parse
#include "common/common.h" // putError, printToStdErr
#include "file-io.h" // fileIO*()
#include "common/memory.h" // copyString

typedef struct {
    char *foo;
    char *sitePath; // borrowed from WebApp
} SiteIni;

void
siteIniInit(SiteIni *this);

void
siteIniFreeProps(SiteIni *this);

/**
 * Reads and parses $filePath, and return true if it was valid.
 */
bool
siteIniReadAndValidate(SiteIni *this, char *filePath, char *err);

#endif