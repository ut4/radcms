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
#include "common/memory.h"
#include "common/timer.h" // timerStart() etc.

typedef enum {
    FW_EVENT_ADDED,
    FW_EVENT_MODIFIED,
    FW_EVENT_DELETED,
    FW_EVENT_OTHER,
} FWEventType;

typedef void (*onFWEvent)(FWEventType type, const char *fileName, void *myPtr);

typedef struct {
    onFWEvent onEventFn;
} FileWatcher;

void
fileWatcherInit(FileWatcher *this, onFWEvent onEventFn);

void
fileWatcherFreeProps(FileWatcher *this);

/**
 * A function that returns false if the changes of $fileName should be ignored,
 * or true if accepted.
 */
typedef bool (*fileNameMatcher)(const char *fileName);

bool
fileWatcherWatch(FileWatcher *this, const char *path, fileNameMatcher matcherFn,
                 void *myPtr, char *err);

#endif