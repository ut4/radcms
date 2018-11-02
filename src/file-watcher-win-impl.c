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
fileWatcherWatch(FileWatcher *this, const char *dir, void *myPtr, char *err) {
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
    DWORD lastIncomingAction = 0;
    char fileName[MAX_PATH + 1];
    const struct timespec fileLockWaitTime = {0, FILE_LOCK_WAIT_TIME};
    timerInit();
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
            DWORD incomingAction = notifyBuffer[0].Action;
            /*
             * Wait 100ms before doing anything (you can't use the file at this
             * point).
             */
            nanosleep(&fileLockWaitTime, NULL);
            /*
             * Done waiting, check that at least 120ms has passed since the last
             * identical event.
             */
            if (incomingAction == lastIncomingAction &&
                timerGetTime() < MIN_TIME_BETWEEN_EVENTS) {
                lastIncomingAction = incomingAction;
                timerStart();
                continue;
            }
            unsigned action = 0;
            switch (incomingAction) {
                case FILE_ACTION_ADDED:
                    action = FW_ACTION_ADDED;
                    break;
                case FILE_ACTION_MODIFIED:
                    action = FW_ACTION_MODIFIED;
                    break;
                case FILE_ACTION_REMOVED:
                    action = FW_ACTION_DELETED;
                    break;
                default:
                    printToStdErr("Unsupported fw event type %lu.\n", incomingAction);
            }
            lastIncomingAction = incomingAction;
            timerStart();
            if (action != 0) {
                this->onEventFn(action, unicodeFileNameToMb(
                    &notifyBuffer[0], fileName), myPtr);
            }
        } else {
            putError("Failed to ReadDirectoryChangesW(): %lu.\n", GetLastError());
            return false;
        }
    }
    return true;
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