#pragma once

#include "../include/db.hpp"
#include "../include/my-fs.hpp"
#include "../include/duk.hpp"
#include "../include/static-data.hpp" // getDbSchemaSql()

bool
testUtilsSetupTestDb(Db *db, std::string &err);

bool
testUtilsExecSql(Db *db, const char *sql);

bool
testUtilsCompileAndCache(duk_context *ctx, const char *code, char *key,
                         std::string &err);

bool
testUtilsReadAndRunGlobal(duk_context *ctx, const std::string &appPath,
                          const std::string &fileName, std::string &err);
