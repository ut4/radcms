#include "../include/common-services.hpp"

static size_t provideDataToCurlFromMem(void *buf, size_t multiplier, size_t nmemb,
                                       void *myPtr);
static size_t provideDataToCurlFromFile(void *buf, size_t size, size_t nmemb,
                                        void *myPtr);
static void getUrlInfo(const std::string &fullUrl, std::string &outDomain,
                       std::string &outPath);

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
CurlUploader::uploadFromMem(const char *fullUrl, const char *contents) {
    int status = this->initUploadOpts(fullUrl);
    if (status) return status;
    void *curl = this->curl;
    curl_easy_setopt(curl, CURLOPT_READFUNCTION, provideDataToCurlFromMem);
    this->pendingUploadState = {contents, nullptr, strlen(contents)};
    curl_easy_setopt(curl, CURLOPT_READDATA, &this->pendingUploadState);
    curl_easy_setopt(curl, CURLOPT_INFILESIZE_LARGE,
                     (curl_off_t)this->pendingUploadState.sizeleft);
    return this->perform();
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
    int res = this->perform();
    fclose(this->pendingUploadState.fileHandle);
    return res;
}

int
CurlUploader::deleteItem(const char *serverUrl, const char *itemPath, bool asDir) {
    std::string domain;
    std::string path;
    getUrlInfo(serverUrl, domain, path);
    //
    int status = this->initUploadOpts(domain.c_str(), true);
    if (status) return status;
    std::size_t l = 0;
    const std::string p = path + itemPath;
    struct curl_slist *headerlist = nullptr;
    headerlist = curl_slist_append(headerlist, ("DELE " + p).c_str());
    if (asDir && (l = p.rfind('/')) != std::string::npos && l > 0) {
        headerlist = curl_slist_append(headerlist, ("RMD " + p.substr(0, l)).c_str());
    }
    curl_easy_setopt(this->curl, CURLOPT_POSTQUOTE, headerlist);
    // Prevents curl from executing an extra LIST command (thanks stackoverflow.com/a/15606114)
    curl_easy_setopt(this->curl, CURLOPT_NOBODY, 1L);
    return this->perform(headerlist);
}

int
CurlUploader::initUploadOpts(const char *fullUrl, bool isDelete) {
    if (this->pendingUploadState.sizeleft > 0) return UPLOAD_BUSY;
    if (!this->curl) return UPLOAD_UNEXPECTED_ERR;
    void *curl = this->curl;
    curl_easy_setopt(curl, CURLOPT_URL, fullUrl);
    curl_easy_setopt(curl, CURLOPT_USERNAME, this->username);
    curl_easy_setopt(curl, CURLOPT_PASSWORD, this->password);
    if (!isDelete) {
        curl_easy_setopt(curl, CURLOPT_FTP_CREATE_MISSING_DIRS, CURLFTP_CREATE_DIR);
        curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);
    }
    return 0;
}

int
CurlUploader::perform(struct curl_slist *headerlist) {
    CURLcode res = curl_easy_perform(this->curl);
    this->pendingUploadState.sizeleft = 0;
    if (headerlist) curl_slist_free_all(headerlist);
    curl_easy_reset(this->curl);
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

static void
getUrlInfo(const std::string &fullUrl, std::string &domain, std::string &path) {
    size_t domainStart = fullUrl.find("//");
    size_t pathStart = fullUrl.find('/', domainStart != std::string::npos ? domainStart + 2 : 0);
    if (pathStart != std::string::npos) {
        domain = fullUrl.substr(0, pathStart); // ftp://foo.bar/dir/file.txt -> ftp://foo.bar,
                                               // //foo.bar/dir/file.txt -> //foo.bar
        size_t l = fullUrl.size();
        path = fullUrl.substr(pathStart,
            l - pathStart - (fullUrl[l - 1] == '/')); // .../dir/file.txt -> /file.txt,
                                                      // .../dir/file.txt/ -> /file.txt
    } else {
        domain = fullUrl;
        path = "";
    }
}
