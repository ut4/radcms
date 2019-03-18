#include "../include/app-env.hpp"

#define MAIN_VIEW_URL "http://localhost:3000/frontend/app.html"

static bool setPlatformSpecificPaths(AppEnv *self);

AppEnv::~AppEnv() {
    if (this->dukCtx) duk_destroy_heap(this->dukCtx);
    transpilerFreeProps();
}

bool
AppEnv::init(const char *appPath) {
    this->appPath = appPath;
    myFsNormalizePath(this->appPath);
    if (!setPlatformSpecificPaths(this)) return false;
    myFsNormalizePath(this->dataPath);
    this->dataPath += "insane/";
    myFsNormalizePath(this->homePath);
    if (!myFsMakeDirs(this->dataPath.c_str(), this->errBuf)) return false;
    if (!(this->dukCtx = myDukCreate(this->errBuf))) return false;
    transpilerInit();
    transpilerSetPrintErrors(false); // use transpilerGetLastError() instead.
    return true;
}

int AppEnv::openMainViewInBrowser() {
#if defined(INSN_IS_WIN)
    return system("start " MAIN_VIEW_URL);
#elif defined(INSN_IS_LINUX)
    return system("xdg-open " MAIN_VIEW_URL);
#elif defined(INSN_IS_MAC)
    return system("open " MAIN_VIEW_URL);
#endif
}

static bool
setPlatformSpecificPaths(AppEnv *self) {
#if defined(INSN_IS_WIN)
    char path[MAX_PATH];
    // C:\Users\username\AppData\Roaming
    if (SHGetFolderPathA(NULL, CSIDL_APPDATA, NULL, 0, path) != S_OK) return false;
    self->dataPath = path;
    if (SHGetFolderPathA(NULL, CSIDL_PROFILE, NULL, 0, path) != S_OK) return false;
    self->homePath = path;
    return true;
#elif defined(INSN_IS_LINUX)
    return false;
#elif defined(INSN_IS_MAC)
    return false;
#endif
}
