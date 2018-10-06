#ifndef rad3_web_h
#define rad3_web_h

#include <stdbool.h>
#include "api/component.h"

typedef struct {
    const char *rootDir;
    struct MHD_Daemon *daemon;
    HandlerDef getHandlers[1];
    HandlerDef putHandlers[1];
} App;

void
appInit(const char *rootDir, char *tempHack);

int
appRespond(void *cls, struct MHD_Connection *connection, const char *url,
           const char *method, const char *version, const char *uploadData,
           size_t *uploadDataSize, void **myPtr);

bool
appStart();

void
appShutdown();

#endif