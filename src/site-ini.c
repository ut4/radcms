#include "../include/site-ini.h"

static int
receiveIniVal(void* myPtr, const char* section, const char* key,
              const char* value) {
    #define MATCH(s, n) strcmp(section, s) == 0 && strcmp(key, n) == 0
    SiteIni* siteIni = (SiteIni*)myPtr;
    if (MATCH("Site", "mainLayoutFileName")) {
        siteIni->mainLayoutFileName = copyString(value);
    } else {
        printToStdErr("Config warn: Unknown site.ini setting [%s]%s.\n",
                      section, key);
        return 0;
    }
    return 1;
}

static bool
validateFields(SiteIni *this, char *err) {
    if (!this->mainLayoutFileName || strlen(this->mainLayoutFileName) == 0) {
        putError("Config err: [Site]mainLayoutFileName missing from site.ini\n");
        return false;
    }
    size_t l = strlen(this->rootDir) + strlen(this->mainLayoutFileName) + 1;
    char layoutFilePath[l];
    snprintf(layoutFilePath, l, "%s%s", this->rootDir, this->mainLayoutFileName);
    if (!fileIOIsWritable(layoutFilePath)) {
        putError("Config err: main layout file '%s' is not writable.\n",
                 layoutFilePath);
        return false;
    }
    return true;
}

void
siteIniInit(SiteIni *this) {
    this->mainLayoutFileName = NULL;
    this->rootDir = NULL;
}

void
siteIniDestruct(SiteIni *this) {
    if (this->mainLayoutFileName) {
        FREE_STR(this->mainLayoutFileName);
    }
}

bool
siteIniReadAndValidate(SiteIni *this, char *filePath, char *err) {
    // -1 == file open error, -2 == mem error
    if (ini_parse(filePath, receiveIniVal, this) < 0) {
        putError("Config err: Failed to read site.ini '%s'.\n", filePath);
        return false;
    }
    // this->* are now populated, check that all required fields are set
    return validateFields(this, err);
}
