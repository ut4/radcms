#ifndef insn_websiteFwHandlers_h
#define insn_websiteFwHandlers_h

#include "common/events.h" // onEvent()
#include "file-watcher.h"
#include "website-diff-manager.h"

void
websiteFWHandlersInit(Website *site);

void
websiteHandleFWEvent(FWEventType type, const char *fileName, void *myPtr);

bool
websiteCheckIsFWFileAcceptable(const char *fileName);

#endif