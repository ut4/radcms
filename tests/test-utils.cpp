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
