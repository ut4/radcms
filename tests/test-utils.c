#include "test-utils.h"

bool
testUtilsSetupTestDb(Db *db, char *err) {
    if (!dbOpen(db, ":memory:", err)) {
        printToStdErr(err);
        return false;
    }
    char *sqliteErr = NULL;
    if (sqlite3_exec(db->conn,
"CREATE TABLE websites \
(`id` INTEGER PRIMARY KEY AUTOINCREMENT,\
`graph` TEXT);\
INSERT INTO websites VALUES\
(1, \"2|1/a|0|a.lua|2/b|0|b.lua|\");", NULL, NULL, &sqliteErr) != SQLITE_OK) {
        printToStdErr("Failed to create the test database: %s.\n", sqliteErr);
        sqlite3_free(sqliteErr);
        return false;
    }
    return true;
}
