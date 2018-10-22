#ifndef insn_testUtils_h
#define insn_testUtils_h

#include "../include/db.h"

bool
testUtilsSetupTestDb(Db *db, char *err);

bool
testUtilsExecSql(Db *db, const char *sql);

#endif