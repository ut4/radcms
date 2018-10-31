#ifndef insn_testUtils_h
#define insn_testUtils_h

#include "../include/db.h"
#include "../include/duk.h"

bool
testUtilsSetupTestDb(Db *db, char *err);

bool
testUtilsExecSql(Db *db, const char *sql);

bool
testUtilsCompileAndCache(duk_context *ctx, const char *code, char *key, char *err);

#endif