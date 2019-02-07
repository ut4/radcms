#include "../include/common-services.hpp"

static size_t provideDataToCurlFromMem(void *buf, size_t multiplier, size_t nmemb,
                                       void *myPtr);
static size_t provideDataToCurlFromFile(void *buf, size_t size, size_t nmemb,
                                        void *myPtr);

CurlUploader::~CurlUploader() {
    curl_easy_cleanup(this->curl);
}

bool
CurlUploader::init(std::string &err) {
    if ((this->curl = curl_easy_init())) {
        return true;
    }
    err = "Failed to curl_easy_init()\n.";
    return false;
}

int
CurlUploader::initUploadOpts(const char *fullUrl) {
    if (this->pendingUploadState.sizeleft > 0) return UPLOAD_BUSY;
    if (!this->curl) return UPLOAD_UNEXPECTED_ERR;
    void *curl = this->curl;
    curl_easy_setopt(curl, CURLOPT_URL, fullUrl);
    curl_easy_setopt(curl, CURLOPT_USERNAME, this->username);
    curl_easy_setopt(curl, CURLOPT_PASSWORD, this->password);
    curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);
    curl_easy_setopt(curl, CURLOPT_FTP_CREATE_MISSING_DIRS, CURLFTP_CREATE_DIR);
    return 0;
}

int
CurlUploader::uploadFromMem(const char *fullUrl, const char *contents) {
    int status = this->initUploadOpts(fullUrl);
    if (status) return status;
    void *curl = this->curl;
    curl_easy_setopt(curl, CURLOPT_READFUNCTION, provideDataToCurlFromMem);
    this->pendingUploadState = {contents, nullptr, strlen(contents)};
    curl_easy_setopt(curl, CURLOPT_READDATA, &this->pendingUploadState);
    curl_easy_setopt(curl, CURLOPT_INFILESIZE_LARGE, (curl_off_t)this->pendingUploadState.sizeleft);
    CURLcode res = curl_easy_perform(curl);
    this->pendingUploadState.sizeleft = 0;
    curl_easy_reset(curl);
    if (res == CURLE_OK) return UPLOAD_OK;
    std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << ".\n";
    return res;
}

int
CurlUploader::uploadFromDisk(const char *fullUrl, const char *localFilePath) {
    int status = this->initUploadOpts(fullUrl);
    if (status) return status;
    this->pendingUploadState = {nullptr, fopen(localFilePath, "rb"), 1};
    if (!this->pendingUploadState.fileHandle) {
        this->pendingUploadState.sizeleft = 0;
        return UPLOAD_COULDNT_READ_FILE;
    }
    void *curl = this->curl;
    curl_easy_setopt(curl, CURLOPT_READFUNCTION, provideDataToCurlFromFile);
    curl_easy_setopt(curl, CURLOPT_READDATA, &this->pendingUploadState);
    CURLcode res = curl_easy_perform(curl);
    fclose(this->pendingUploadState.fileHandle);
    this->pendingUploadState.sizeleft = 0;
    curl_easy_reset(curl);
    if (res == CURLE_OK) return UPLOAD_OK;
    std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << ".\n";
    return res;
}

static size_t
provideDataToCurlFromMem(void *buf, size_t multiplier, size_t nmemb, void *myPtr) {
    auto *state = static_cast<CurlUploadState*>(myPtr);
    size_t max = multiplier * nmemb;
    if (max < 1) return 0;
    if (state->sizeleft > 0) {
        size_t chunkSize = max > state->sizeleft ? state->sizeleft : max;
        memcpy(buf, state->fileContents, chunkSize);
        state->fileContents += chunkSize;
        state->sizeleft -= chunkSize;
        return chunkSize;
    }
    return 0; // no more data left to deliver
}

static size_t
provideDataToCurlFromFile(void *buf, size_t multiplier, size_t nmemb, void *myPtr) {
    FILE *f = static_cast<CurlUploadState*>(myPtr)->fileHandle;
    return !ferror(f) ? fread(buf, multiplier, nmemb, f) * multiplier : 0;
}
