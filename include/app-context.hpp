#pragma once

#include <string>
#include <unistd.h> // getcwd
#include "db.hpp"
#include "duk.hpp"
#include "my-fs.hpp"
#include "../c-libs/jsx/include/jsx-transpiler.hpp"

/**
 * A container that manages and owns stuff.
 */
struct AppContext {
    std::string sitePath; // An absolute path to the website source dir, always ends with "/"
    std::string appPath; // An absolute path to the app/binary dir, always ends with "/"
    std::string errBuf; // A shared error buffer
    Db db;
    duk_context *dukCtx = nullptr;
    unsigned sitePathLen = 0;
    ~AppContext();
    bool init(const std::string &sitePath);
};
