#include "../include/app-context.hpp"

AppContext::~AppContext() {
    if (this->dukCtx) duk_destroy_heap(this->dukCtx);
    transpilerFreeProps();
}

bool
AppContext::init(const std::string &sitePath) {
    this->sitePath = sitePath;
    myFsNormalizePath(this->sitePath);
    constexpr int MAX_FILENAME_LEN = 40;
    if (this->sitePath.size() + MAX_FILENAME_LEN > PATH_MAX) {
        this->errBuf = "Sitepath too long.\n";
        return false;
    }
    char cwd[PATH_MAX];
    if (!getcwd(cwd, PATH_MAX)) {
        this->errBuf = "Failed to getcwd().\n";
        return false;
    }
    this->appPath = cwd;
    myFsNormalizePath(this->appPath);
    //
    if (!this->db.open(this->sitePath + "data.db", this->errBuf)) return false;
    if (!(this->dukCtx = myDukCreate(this->errBuf))) return false;
    transpilerInit();
    transpilerSetPrintErrors(false); // use transpilerGetLastError() instead.
    return true;
}
