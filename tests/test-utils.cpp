#include "test-utils.hpp"

bool
testUtilsSetupTestDb(Db *db, std::string &err) {
    if (!db->open(":memory:", err)) return false;
    char *sqliteErr = nullptr;
    if (sqlite3_exec(db->conn, getDbSchemaSql(), nullptr, nullptr,
                     &sqliteErr) != SQLITE_OK) {
        err = "Failed to create the test database: " + std::string(sqliteErr) +
              ".\n";
        sqlite3_free(sqliteErr);
        return false;
    }
    return true;
}

bool
testUtilsExecSql(Db *db, const char *sql) {
    char *sqliteErr = nullptr;
    if (sqlite3_exec(db->conn, sql, nullptr, nullptr, &sqliteErr) != SQLITE_OK) {
        std::cerr << "Failed to run sql: " << sqliteErr << ".\n";
        sqlite3_free(sqliteErr);
        return false;
    }
    return true;
}

bool
testUtilsCompileAndCache(duk_context *ctx, const char *code, char *key,
                         std::string &err) {
    duk_push_global_stash(ctx);
    if (!dukUtilsCompileStrToFn(ctx, code, key, err)) return false;
    duk_put_prop_string(ctx, -2, key);
    duk_pop(ctx); // stash
    return true;
}

bool
testUtilsReadAndRunGlobal(duk_context *ctx, const std::string &appPath,
                          const std::string &fileName, std::string &err) {
    std::string code;
    if (!myFsRead(appPath + fileName, code, err)) return false;
    return dukUtilsCompileAndRunStrGlobal(ctx, code.c_str(),
                                          fileName.c_str(), err);
}
