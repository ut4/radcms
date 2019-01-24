#include "../include/common-services.hpp"

static size_t
myCurlPutChunk(void *buf, size_t multiplier, size_t nmemb, void *myPtr);

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
CurlUploader::upload(const char *fullUrl, const char *contents) {
    if (this->pendingUploadState.sizeleft > 0) return UPLOAD_BUSY;
    if (!this->curl) return UPLOAD_UNEXPECTED_ERR;
    void *curl = this->curl;
    curl_easy_setopt(curl, CURLOPT_URL, fullUrl);
    curl_easy_setopt(curl, CURLOPT_USERNAME, this->username);
    curl_easy_setopt(curl, CURLOPT_PASSWORD, this->password);
    curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);
    curl_easy_setopt(curl, CURLOPT_FTP_CREATE_MISSING_DIRS, CURLFTP_CREATE_DIR);
    curl_easy_setopt(curl, CURLOPT_READFUNCTION, myCurlPutChunk);
    this->pendingUploadState = {contents, strlen(contents)};
    curl_easy_setopt(curl, CURLOPT_READDATA, &this->pendingUploadState);
    curl_easy_setopt(curl, CURLOPT_INFILESIZE_LARGE, (curl_off_t)this->pendingUploadState.sizeleft);
    CURLcode res = curl_easy_perform(curl);
    curl_easy_reset(curl);
    if (res == CURLE_OK) return UPLOAD_OK;
    std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << ".\n";
    if (res == CURLE_LOGIN_DENIED) return UPLOAD_LOGIN_DENIED;
    return res;
}

static size_t
myCurlPutChunk(void *buf, size_t multiplier, size_t nmemb, void *myPtr) {
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
