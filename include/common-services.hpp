#pragma once

#include <cstring> // strlen(), memcpy()
#include <iostream> // std::cerr
#include <curl/curl.h>

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
