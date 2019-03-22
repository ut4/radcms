#pragma once

// Ultra-thin bindings for https://github.com/passcod/notify.

extern "C" {
enum FWEventType {
    FW_EVENT_NOTICE_WRITE,
    FW_EVENT_NOTICE_REMOVE,
    FW_EVENT_CREATE,
    FW_EVENT_WRITE,
    FW_EVENT_CHMOD,
    FW_EVENT_REMOVE,
    FW_EVENT_RENAME,
    FW_EVENT_RESCAN,
    FW_EVENT_ERROR,
};

typedef struct FileWatcherS FileWatcher;

extern FileWatcher*
fileWatcherNew(unsigned debounceTimeMillis);

extern void
fileWatcherWatch(FileWatcher* self, const char *path,
                 void (*)(enum FWEventType, const char*, void*),
                 void* myPtr);

extern void
fileWatcherStop(FileWatcher* self, const char *path);
}
