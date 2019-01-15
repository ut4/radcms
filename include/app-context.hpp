#pragma once

#include <string>
#include "db.hpp"
#include "duk.hpp"
#include "../c-libs/fwatcher/include/file-watcher.hpp"

struct AppContext {
    std::string sitePath; // An absolute path to the website source dir, always ends with "/"
    std::string appPath; // An absolute path to the app/binary dir, always ends with "/"
    std::string errBuf; // A shared error buffer
    // Borrowed from main.cpp
    Db *db;
    duk_context *dukCtx;
    FileWatcher *fileWatcher;
};
