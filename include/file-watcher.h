#ifndef insn_fileWatcher_h
#define insn_fileWatcher_h

#include <stdbool.h>
#if defined(_WIN32) && !defined(__CYGWIN__)
#define F_WATCHER_IS_WIN 1
#include <stdlib.h>  // wcstombs, wchar_t
#include <windows.h> // ReadDirectoryChangesW()
#endif
#include "memory.h"
#include "timer.h" // timerStart() etc.

typedef enum {
    FW_ACTION_ADDED,
    FW_ACTION_MODIFIED,
    FW_ACTION_DELETED,
} FWEventType;

typedef void (*onFWEvent)(FWEventType type, char *fileName);

typedef struct {
    onFWEvent onEventFn;
} FileWatcher;

void
fileWatcherInit(FileWatcher *this, onFWEvent onEventFn);

void
fileWatcherFreeProps(FileWatcher *this);

bool
fileWatcherWatch(FileWatcher *this, const char *dir, char *err);

#endif