#include <stdio.h>
#include "../include/templating.h"

void templateProviderInit(TemplateProvider *this, lua_State *L) {
    this->L = L;
}

bool templateProviderLoadFnFromFile(
    TemplateProvider *this,
    const char *fileName,
    char *err
) {
    // <temp-hack>
    if (strcmp(fileName, "main-layout.lua") == 0 ||
        strcmp(fileName, "articles.lua") == 0 ||
        strcmp(fileName, "footer.lua") == 0) {
    // </temp-hack>
        return luaUtilsLoadFnFromDisk(this->L, fileName, err); // stack [fn]
    } else {
        sprintf(err, "'%s' is not valid layout template name.", fileName);
    }
    return false;
}
