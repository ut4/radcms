#ifndef insn_fileWatcher_h
#define insn_fileWatcher_h

#include <stdbool.h>
#include <stdio.h> // sprintf
#include <time.h> // struct timespec
#if defined(INSN_IS_WIN)
#include <stdlib.h>  // wcstombs, wchar_t
#include <windows.h> // ReadDirectoryChangesW()
#elif defined(INSN_IS_LINUX)
#include <unistd.h> // close()
#include <sys/inotify.h>
#endif
#include "timer.h" // timerStart() etc.

#define FW_ERR_MAX 256

typedef enum {
    FW_EVENT_ADDED,
    FW_EVENT_MODIFIED,
    FW_EVENT_DELETED,
    FW_EVENT_OTHER,
} FWEventType;

typedef void (*onFWEvent)(FWEventType type, const char *fileName, void *myPtr);

typedef struct {
    onFWEvent onEventFn;
    char errBuf[FW_ERR_MAX];
} FileWatcher;

/**
 * @returns {bool} true == accept, false == ignore
 */
typedef bool (*fileNameMatcher)(const char *fileName);

char*
fileWatcherWatch(FileWatcher *self, const char *path, onFWEvent onEventFn,
                 fileNameMatcher matcherFn, void *myPtr);

#endif