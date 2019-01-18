#pragma once

#include "../include/db.hpp"
#include "../include/my-fs.hpp"
#include "../include/static-data.hpp" // getDbSchemaSql()

bool
testUtilsSetupTestDb(Db *db, std::string &err);

bool
testUtilsExecSql(Db *db, const char *sql);
