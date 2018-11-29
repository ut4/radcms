#include "../include/file-watcher.h"

void
fileWatcherInit(FileWatcher *this, onFWEvent onEventFn) {
    this->onEventFn = onEventFn;
}

void
fileWatcherFreeProps(FileWatcher *this) {
    //
}

bool
fileWatcherWatch(FileWatcher *this, const char *path, fileNameMatcher matcherFn,
                 void *myPtr, char *err) {
    int fd = inotify_init();
    if (fd < 0) {
        putError("Failed to inotify_init().\n");
        return false;
    }
    int wd = inotify_add_watch(fd, path, IN_MODIFY | IN_CREATE | IN_DELETE);
    if (wd == -1) {
        putError("LinuxFileWatcher: inotify_add_watch().\n");
        return false;
    }
    #define MIN_TIME_BETWEEN_EVENTS 0.12 // 120ms
    #define FILE_LOCK_WAIT_TIME 100000000L // 100ms
    #define NOTIFY_BUFFER_ELEM_COUNT 8
    #define FLEXIBLE_STR_MAX 260
    const size_t EVENT_SIZE = sizeof(struct inotify_event);
    const size_t BUF_LEN = NOTIFY_BUFFER_ELEM_COUNT * (EVENT_SIZE + FLEXIBLE_STR_MAX + 1);
    const struct timespec fileLockWaitTime = {0, FILE_LOCK_WAIT_TIME};
    //
    char buf[BUF_LEN];
    const struct inotify_event *event;
    timerInit();
    unsigned lastAction = 0;
    while (true) {
        int len = read(fd, buf, BUF_LEN);
        if (len < 0) {
            putError("LinuxFileWatcher: Failed to read '%s'.\n", path);
            return false;
        }
        for (char *ptr = buf; ptr < buf + len; ptr += EVENT_SIZE + event->len) {
            event = (const struct inotify_event*)ptr;
            unsigned incomingAction = FW_ACTION_OTHER;
            if (event->mask & IN_CREATE) {
                incomingAction = FW_ACTION_ADDED;
            } else if (event->mask & IN_MODIFY) {
                incomingAction = FW_ACTION_MODIFIED;
            } else if (event->mask & IN_DELETE) {
                incomingAction = FW_ACTION_DELETED;
            } else {
                printToStdErr("Warn: Unsupported fw event type.\n");
                continue;
            }
            //
            if (incomingAction == lastAction &&
                timerGetTime() < MIN_TIME_BETWEEN_EVENTS) {
                lastAction = incomingAction;
                timerStart();
                continue;
            }
            //
            if (matcherFn && !matcherFn(event->name)) continue;
            nanosleep(&fileLockWaitTime, NULL);
            lastAction = incomingAction;
            timerStart();
            this->onEventFn(incomingAction, event->name, myPtr);
        }
    }
    //
    if (inotify_rm_watch(fd, wd) != 0 || close(fd) != 0) {
        perror("LinuxFileWatcher: Failed to close handle(s).\n");
    }
    return true;
    #undef MIN_TIME_BETWEEN_EVENTS
    #undef FILE_LOCK_WAIT_TIME
    #undef NOTIFY_BUFFER_ELEM_COUNT
    #undef FLEXIBLE_STR_MAX
}
