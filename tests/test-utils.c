#include "test-utils.h"

bool
testUtilsSetupTestDb(Db *db, char *err) {
    if (!dbOpen(db, ":memory:", err)) {
        printToStdErr(err);
        return false;
    }
    char *sqliteErr = NULL;
    if (sqlite3_exec(db->conn,
"create table websites ("
"    `id` INTEGER PRIMARY KEY AUTOINCREMENT,"
"    `graph` text"
");"
"create table componentTypes ("
"    `id` integer primary key autoincrement,"
"    `name` varchar(64)"
");"
"create table components ("
"    `id` integer primary key autoincrement,"
"    `name` varchar(32) not null,"
"    `json` json,"
"    componentTypeId integer not null,"
"    foreign key (componentTypeId) references componentTypes(id)"
");", NULL, NULL, &sqliteErr) != SQLITE_OK) {
        printToStdErr("Failed to create the test database: %s.\n", sqliteErr);
        sqlite3_free(sqliteErr);
        return false;
    }
    return true;
}

bool
testUtilsExecSql(Db *db, const char *sql) {
    char *sqliteErr = NULL;
    if (sqlite3_exec(db->conn, sql, NULL, NULL, &sqliteErr) != SQLITE_OK) {
        printToStdErr("Failed to run sql: %s.\n", sqliteErr);
        sqlite3_free(sqliteErr);
        return false;
    }
    return true;
}
