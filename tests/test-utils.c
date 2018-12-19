#include "test-utils.h"

bool
testUtilsSetupTestDb(Db *db, char *err) {
    if (!dbOpen(db, ":memory:", err)) {
        printToStdErr("%s", err);
        return false;
    }
    char *sqliteErr = NULL;
    if (sqlite3_exec(db->conn, getDbSchemaSql(), NULL, NULL,
                     &sqliteErr) != SQLITE_OK) {
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

bool
testUtilsCompileAndCache(duk_context *ctx, const char *code, char *key, char *err) {
    duk_push_global_stash(ctx);
    if (!dukUtilsCompileStrToFn(ctx, code, key, err)) return false;
    duk_put_prop_string(ctx, -2, key);
    duk_pop(ctx); // stash
    return true;
}

char*
testUtilsGetNormalizedCwd() {
    char cwd[PATH_MAX];
    if (!getcwd(cwd, sizeof(cwd))) {
        perror("getcwd() error");
        return NULL;
    }
    return fileIOGetNormalizedPath(cwd);
}

bool
testUtilsReadAndRunGlobal(duk_context *ctx, char *appPath, const char *fileName,
                          char *err) {
    STR_CONCAT(filePath, appPath, fileName);
    char *code = fileIOReadFile(filePath, err);
    if (!code) return false;
    bool success = dukUtilsCompileAndRunStrGlobal(ctx, code, fileName, err);
    FREE_STR(code);
    return success;
}
