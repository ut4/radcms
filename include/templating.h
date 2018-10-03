#ifndef rad3_templating_h
#define rad3_templating_h

#include <string.h> // strcmp
#include "lua.h"

/*
 * Reads and compiles template files.
 */
typedef struct {
    lua_State *L;
} TemplateProvider;

/*
 * Intializes $this.
 */
void templateProviderInit(TemplateProvider *this, lua_State *L);

/*
 * Reads $fileName from disc, compiles it, and leaves the compiled function at
 * the top of the lua stack. Returns NULL if the file wasn't found.
 */
bool templateProviderLoadLayout(
    TemplateProvider *this,
    const char *fileName,
    char *err
);

#endif