#ifndef insn_fileWatcher_h
#define insn_fileWatcher_h

#include <stdbool.h>
#include <time.h> // struct timespec
#if defined(INSN_IS_WIN)
#include <stdlib.h>  // wcstombs, wchar_t
#include <windows.h> // ReadDirectoryChangesW()
#elif defined(INSN_IS_LINUX)
#include <unistd.h> // close()
#include <sys/inotify.h>
#endif
#include "memory.h"
#include "timer.h" // timerStart() etc.

typedef enum {
    FW_ACTION_ADDED,
    FW_ACTION_MODIFIED,
    FW_ACTION_DELETED,
    FW_ACTION_OTHER,
} FWEventType;

typedef void (*onFWEvent)(FWEventType type, const char *fileName, void *myPtr);

typedef struct {
    onFWEvent onEventFn;
} FileWatcher;

void
fileWatcherInit(FileWatcher *this, onFWEvent onEventFn);

void
fileWatcherFreeProps(FileWatcher *this);

bool
fileWatcherWatch(FileWatcher *this, const char *dir, void *myPtr, char *err);

#endif