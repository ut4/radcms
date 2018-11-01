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
fileWatcherWatch(FileWatcher *this, const char *dir, char *err) {
    #define MIN_TIME_BETWEEN_EVENTS 0.12 // 120ms
    #define NOTIFY_BUFFER_ELEM_COUNT 32
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
    DWORD lastAction = 0;
    char fileName[MAX_PATH + 1];
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
            DWORD action = notifyBuffer[0].Action;
            if (action == lastAction && timerGetTime() < MIN_TIME_BETWEEN_EVENTS) {
                lastAction = notifyBuffer[0].Action;
                timerStart();
                continue;
            }
            switch (action) {
                case FILE_ACTION_ADDED:
                    this->onEventFn(FW_ACTION_ADDED, unicodeFileNameToMb(
                        &notifyBuffer[0], fileName));
                    break;
                case FILE_ACTION_MODIFIED:
                    this->onEventFn(FW_ACTION_MODIFIED, unicodeFileNameToMb(
                        &notifyBuffer[0], fileName));
                    break;
                case FILE_ACTION_REMOVED:
                    this->onEventFn(FW_ACTION_DELETED, unicodeFileNameToMb(
                        &notifyBuffer[0], fileName));
                    break;
                default:
                    printToStdErr("Unsupported fw event type %lu.\n", action);
            }
            lastAction = notifyBuffer[0].Action;
            timerStart();
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