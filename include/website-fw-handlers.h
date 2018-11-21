#ifndef insn_websiteFwHandlers_h
#define insn_websiteFwHandlers_h

#include "file-watcher.h"
#include "website.h"

void
websiteHandleFWEvent(FWEventType type, const char *fileName, void *myPtr);

bool
websiteCheckIsFWFileAcceptable(const char *fileName);

#endif