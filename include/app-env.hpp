#pragma once

#include <string>
#include <stdlib.h> // system()
#if defined(INSN_IS_WIN)
#include <shlobj.h> // SHGetFolderPathA()
#endif
#include "duk.hpp"
#include "my-fs.hpp"
#include "../c-libs/jsx/include/jsx-transpiler.hpp"

struct AppEnv {
    std::string appPath; // An absolute path to the source/binary dir, always ends with "/"
    std::string dataPath; // An absolute path to a platform-specific data dir, always ends with "/"
    std::string errBuf; // A shared error buffer
    duk_context *dukCtx = nullptr;
    ~AppEnv();
    bool init(const char *appPath);
    int openMainViewInBrowser();
};
