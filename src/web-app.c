#include "../include/web-app.h"

void
webAppInit(WebApp *this) {
    siteIniInit(&this->ini);
}

void
webAppDestruct(WebApp *this) {
    FREE_STR(this->rootDir);
    siteIniDestruct(&this->ini);
}

bool
webAppMakeSiteIni(WebApp *this, const char *rootDir, bool expectExists, char *err) {
    // 1. Normalize $rootDir
    size_t l = strlen(rootDir) + 1;
    if (rootDir[l - 2] != '/') { // add trailing /
        this->rootDir = ALLOCATE_ARR(char, l + 1);
        snprintf(this->rootDir, l + 1, "%s%c", rootDir, '/');
    } else {
        this->rootDir = copyString(rootDir);
    }
    // 2. Check site.ini
    l = strlen(this->rootDir) + strlen("site.ini") + 1;
    char iniFilePath[l];
    snprintf(iniFilePath, l, "%s%s", this->rootDir, "site.ini");
    if (expectExists) {
        return siteIniReadAndValidate(&this->ini, iniFilePath, this->rootDir, err);
    } else {
        return !fileIOIsWritable(iniFilePath);
    }
}
