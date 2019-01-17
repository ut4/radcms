#pragma once

#include <iostream> // std::cerr
#include <curl/curl.h>

enum UploadStatus {
    UPLOAD_OK = 0,
    UPLOAD_LOGIN_DENIED = 1,
    UPLOAD_BUSY = 198,
    UPLOAD_UNEXPECTED_ERR = 199,
};

struct CurlUploadState {
    const char *fileContents;
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
    upload(const char *fullUrl, const char *contents);
};
