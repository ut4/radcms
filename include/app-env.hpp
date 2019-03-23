#pragma once

#include <string>
#include <stdlib.h> // system()
#if defined(INSN_IS_WIN)
#include <shlobj.h> // SHGetFolderPathA()
#elif defined(INSN_IS_LINUX)
#include <pwd.h> // getpwuid()
#endif
#include "duk.hpp"
#include "my-fs.hpp"
#include "../c-libs/jsx/include/jsx-transpiler.hpp"

struct AppEnv {
    std::string appPath; // An absolute path to the source/binary dir, always ends with "/"
    std::string dataPath; // An absolute, platform-specific path to a directory where this
                          // application stores its global data, always ends with "/"
    std::string homePath; // An absolute, platform-specific path to the home directory of
                          // this machine, always ends with "/"
    std::string currentWebsiteDirPath; // Empty, or an absolute path to the directory of the website
                                       // currently being edited (and ends with "/")
    std::string errBuf; // A shared error buffer
    duk_context *dukCtx = nullptr;
    ~AppEnv();
    bool init(const char *appPath);
    int openMainViewInBrowser();
};
