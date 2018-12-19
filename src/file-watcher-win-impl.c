#include "../include/file-watcher.h"

static char *unicodeFileNameToMb(FILE_NOTIFY_INFORMATION *info, char *to);

void
fileWatcherInit(FileWatcher *this, onFWEvent onEventFn) {
    this->onEventFn = onEventFn;
}

void
fileWatcherFreeProps(FileWatcher *this) {
    //
}

bool
fileWatcherWatch(FileWatcher *this, const char *dir, fileNameMatcher matcherFn,
                 void *myPtr, char *err) {
    #define MIN_TIME_BETWEEN_EVENTS 0.12 // 120ms
    #define FILE_LOCK_WAIT_TIME 100000000L // 100ms
    #define NOTIFY_BUFFER_ELEM_COUNT 8
    HANDLE handle = CreateFile(
        dir,
        FILE_LIST_DIRECTORY,                                    // dwDesiredAccess
        FILE_SHARE_WRITE | FILE_SHARE_READ | FILE_SHARE_DELETE, // dwShareMode
        NULL,                                                   // SecurityAttributes
        OPEN_EXISTING,                                          // dwCreationDisposition
        FILE_FLAG_BACKUP_SEMANTICS,                             // dwFlagsAndAttributes
        NULL                                                    // hTemplateFile
    );
    FILE_NOTIFY_INFORMATION notifyBuffer[NOTIFY_BUFFER_ELEM_COUNT];
    if (handle == INVALID_HANDLE_VALUE) {
        putError("WinFileWatcher: Failed to open '%s'.\n", dir);
        return false;
    }
    DWORD bytesReturned = 0;
    char fileName[MAX_PATH + 1];
    const struct timespec fileLockWaitTime = {0, FILE_LOCK_WAIT_TIME};
    timerInit();
    unsigned lastEvent = 0;
    while (true) {
        if (ReadDirectoryChangesW(
            handle,               // hDirectory
            (PVOID)&notifyBuffer, // lpBuffer
            sizeof(notifyBuffer), // nBufferLength
            false,                // bWatchSubtree
            FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_LAST_WRITE,
            &bytesReturned,       // lpBytesReturned
            NULL,                 // lpOverlapped
            NULL                  // lpCompletionRoutine
        ) != 0 && bytesReturned != 0) {
            unsigned incomingEvent = FW_EVENT_OTHER;
            DWORD incomingDword = notifyBuffer[0].Action;
            if (incomingDword == FILE_ACTION_ADDED) {
                incomingEvent = FW_EVENT_ADDED;
            } else if (incomingDword == FILE_ACTION_MODIFIED) {
                incomingEvent = FW_EVENT_MODIFIED;
            } else if (incomingDword == FILE_ACTION_REMOVED) {
                incomingEvent = FW_EVENT_DELETED;
            } else {
                printToStdErr("[Warn]: Unsupported fw event type.\n");
                continue;
            }
            //
            if (incomingEvent == lastEvent &&
                timerGetTime() < MIN_TIME_BETWEEN_EVENTS) {
                lastEvent = incomingEvent;
                timerStart();
                continue;
            }
            //
            unicodeFileNameToMb(&notifyBuffer[0], fileName);
            if (matcherFn && !matcherFn(fileName)) continue;
            nanosleep(&fileLockWaitTime, NULL);
            lastEvent = incomingEvent;
            timerStart();
            this->onEventFn(incomingEvent, fileName, myPtr);
        } else {
            putError("Failed to ReadDirectoryChangesW(): %lu.\n",
                     GetLastError());
            return false;
        }
    }
    return true;
    #undef MIN_TIME_BETWEEN_EVENTS
    #undef FILE_LOCK_WAIT_TIME
    #undef NOTIFY_BUFFER_ELEM_COUNT
}

/** to = char[MAX_PATH + 1]*/
static char*
unicodeFileNameToMb(FILE_NOTIFY_INFORMATION *info, char *to) {
    size_t charCount = info->FileNameLength / sizeof(wchar_t);
    if (charCount > MAX_PATH) charCount = MAX_PATH;
    int numConverted = wcstombs(to, info->FileName, charCount);
    to[numConverted] = '\0';
    return to;
}