#include "../include/site-ini.h"

static int
receiveIniVal(void* myPtr, const char* section, const char* key,
              const char* value) {
    #define MATCH(s, n) strcmp(section, s) == 0 && strcmp(key, n) == 0
    if (MATCH("Site", "foo")) {
        ((SiteIni*)myPtr)->foo = copyString(value);
    } else {
        printToStdErr("Warn: Unknown site.ini setting [%s]%s.\n", section, key);
        return 0;
    }
    return 1;
    #undef MATCH
}

static bool
validateFields(SiteIni *this, char *err) {
    if (!this->foo || strlen(this->foo) == 0) {
        putError("Error: [Site]foo missing from site.ini\n");
        return false;
    }
    return true;
}

void
siteIniInit(SiteIni *this) {
    this->foo = NULL;
    this->rootDir = NULL;
}

void
siteIniFreeProps(SiteIni *this) {
    if (this->foo) FREE_STR(this->foo);
    siteIniInit(this);
}

bool
siteIniReadAndValidate(SiteIni *this, char *filePath, char *err) {
    // -1 == file open error, -2 == mem error
    if (ini_parse(filePath, receiveIniVal, this) < 0) {
        putError("Error: Failed to read site.ini '%s'.\n", filePath);
        return false;
    }
    // this->* are now populated, check that all required fields are set
    return validateFields(this, err);
}
