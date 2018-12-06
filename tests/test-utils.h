#ifndef insn_testUtils_h
#define insn_testUtils_h

#include <unistd.h> // getcwd
#include "../include/db.h"
#include "../include/file-io.h"
#include "../include/duk.h"
#include "../include/static-data.h" // getDbSchemaSql()

bool
testUtilsSetupTestDb(Db *db, char *err);

bool
testUtilsExecSql(Db *db, const char *sql);

bool
testUtilsCompileAndCache(duk_context *ctx, const char *code, char *key, char *err);

char*
testUtilsGetNormalizedCwd();

bool
testUtilsReadAndRunGlobal(duk_context *ctx, char *appPath, const char *fileName,
                          char *err);

#endif