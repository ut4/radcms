#pragma once

#include <cstring> // strlen(), memcpy()
#include <iostream> // std::cerr
#include <vector>
#include <curl/curl.h>
#undef UNICODE
#include <FileWatcher/FileWatcher.h>

enum UploadStatus {
    UPLOAD_OK = 0,
    UPLOAD_LOGIN_DENIED = CURLE_LOGIN_DENIED,
    UPLOAD_COULDNT_READ_FILE = CURLE_FILE_COULDNT_READ_FILE,
    UPLOAD_BUSY = 1998,
    UPLOAD_UNEXPECTED_ERR = 1999,
};

struct CurlUploadState {
    const char *fileContents;
    FILE *fileHandle;
    size_t sizeleft;
};

struct CurlUploader {
    CurlUploadState pendingUploadState;
    void *curl = nullptr;
    const char* username = nullptr;
    const char* password = nullptr;
    ~CurlUploader();
    bool
    init(std::string &err);
    int
    uploadFromMem(const char *fullUrl, const char *contents);
    int
    uploadFromDisk(const char *fullUrl, const char *localFilePath);
    int
    deleteItem(const char *serverUrl, const char *itemPath, bool asDir = false);
    int
    initUploadOpts(const char *fullUrl, bool isDelete = false);
    int
    perform(struct curl_slist *headerlist = nullptr);
};

// =============================================================================

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
    FW_EVENT_NONE,
};

struct QueuedFWEvent {
    FW::String fileName;
    FW::Action eventType;
    bool isProcessed;
};

class NormalizingFWEventHandler: public FW::FileWatchListener {
public:
    static const int DEFAULT_FLUSH_INTERVAL_MILLIS = 120;
    void (*onEvent)(FWEventType type, const char *filePath, void *myPtr);
    void* myPtr;
    /**
     * Collects this event to the event queue ($this->queue);
     */
    void
    handleFileAction(FW::WatchID watchid, const FW::String& dir,
                     const FW::String& fileName, FW::Action action);
    /**
     * Processed all entries in the event queue ($this->queue) in a normalized
     * fashion (removes doubles, converts add + mod into a rename etc.) and
     * dispatches them to $this->onEvent().
     */
    void
    processQueue();
private:
    std::vector<QueuedFWEvent> queue;
    int
    findRelatedMod(const FW::String &fileName, QueuedFWEvent* info[3]);
    int
    findRelatedAdd(const FW::String &fileName, QueuedFWEvent* info[3]);
    int
    findRelatedRem(const FW::String &fileName, QueuedFWEvent* info[3]);
};
