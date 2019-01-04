#pragma once

#include <string>
#include "db.hpp"
#include "duk.hpp"

struct AppContext {
    std::string sitePath; // An absolute path to the website source dir, always ends with "/"
    std::string appPath; // An absolute path to the app/binary dir, always ends with "/"
    std::string errBuf; // A shared error buffer
    Db *db; // Borrowed from main
};

/**
 * Puts AppContext to a duktape stash.
 */
void
jsEnvironmentPutAppContext(duk_context *ctx, AppContext* app, const int stashIsAt);

/**
 * Retrieves AppContext from a duktape stash.
 */
AppContext*
jsEnvironmentPullAppContext(duk_context *ctx, const int stashIsAt);
