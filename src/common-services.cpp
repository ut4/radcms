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

// =============================================================================

void
NormalizingFWEventHandler::handleFileAction(FW::WatchID watchid, const FW::String& dir,
                                            const FW::String& fileName, FW::Action action) {
    QueuedFWEvent &item = this->queue.emplace_back();
    item.fileName = fileName;
    item.eventType = action;
    item.isProcessed = false;
}

void
NormalizingFWEventHandler::processQueue() {
    int itemsLeft = this->queue.size();
    if (!itemsLeft) return;
    for (const auto &item: this->queue) {
        if (itemsLeft == 0) break;
        QueuedFWEvent* info[3] = {nullptr, nullptr, nullptr};
        int count;
        // Possible combinations: [mod]
        //                        [mod, mod]
        //                        [mod, add, mod]
        if (item.eventType == FW::Action::Modified) {
            if (!(count = this->findRelatedMod(item.fileName, info))) continue;
            this->onEvent(FW_EVENT_WRITE, info[0]->fileName.c_str(), this->myPtr);
        // Possible combinations: [add]
        //                        [add, mod]
        //                        [add, mod, mod]
        } else if (item.eventType == FW::Action::Add) {
            if (!(count = this->findRelatedAdd(item.fileName, info))) continue;
            this->onEvent(FW_EVENT_CREATE, info[0]->fileName.c_str(), this->myPtr);
        // Possible combinations: [rem]
        //                        [rem(pathA), add(pathB)]
        //                        [rem(pathA), add(pathB), mod(pathB)]
        } else {
            if (!(count = this->findRelatedRem(item.fileName, info))) continue;
            if (count == 1 || info[1]->eventType != FW::Action::Add)
                this->onEvent(FW_EVENT_REMOVE, info[0]->fileName.c_str(), this->myPtr);
            else
                this->onEvent(FW_EVENT_REMOVE, (info[0]->fileName+">"+info[1]->fileName).c_str(), this->myPtr);
        }
        itemsLeft -= count;
        info[0]->isProcessed = true;
        if (count > 1) info[1]->isProcessed = true; // was add + mod (rename)
        if (count > 2) info[2]->isProcessed = true; // was add + double mod (rename)
    }
    if (itemsLeft > 0)
        std::cerr << "[Error]: Faild to process all events" << std::endl;
    this->queue.clear();
}

#define findRelated(testExpr) \
    int len = 0; \
    for (auto &item: this->queue) { \
        if (testExpr) { \
            if (item.isProcessed) return 0; \
            info[len++] = &item; \
        } \
    } \
    return len

int
NormalizingFWEventHandler::findRelatedMod(const FW::String &fileName, QueuedFWEvent* info[3]) {
    findRelated(item.eventType == FW::Action::Modified && item.fileName == fileName);
}

int
NormalizingFWEventHandler::findRelatedAdd(const FW::String &fileName, QueuedFWEvent* info[3]) {
    findRelated((item.eventType == FW::Action::Add ||
                 item.eventType == FW::Action::Modified) && item.fileName == fileName);
}

int
NormalizingFWEventHandler::findRelatedRem(const FW::String &fileName, QueuedFWEvent* info[3]) {
    findRelated((!item.isProcessed && item.eventType == FW::Action::Delete && item.fileName == fileName) ||
                (len > 0 && !item.isProcessed && item.eventType == FW::Action::Add) ||
                (len > 1 && !item.isProcessed && item.eventType == FW::Action::Modified));
}
