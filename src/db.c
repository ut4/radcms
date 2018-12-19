#include "../include/db.h"

void
dbInit(Db *this) {
    this->conn = NULL;
}

bool
dbOpen(Db *this, const char *filePath, char *err) {
    int status = sqlite3_open(filePath, &this->conn);
    if (status != SQLITE_OK) {
        putError("Couldn't open '%s': %s\n", filePath, sqlite3_errmsg(this->conn));
        return false;
    }
    return true;
}

void
dbDestruct(Db *this) {
    if (this->conn) sqlite3_close(this->conn);
}

bool
dbSelect(Db *this, const char *sql, mapRowFn onRow, void *myPtr, char *err) {
    // 1. Create a prepared statement
    sqlite3_stmt *stmt;
    int status = sqlite3_prepare_v2(this->conn, sql, -1, &stmt, NULL);
    if (status != SQLITE_OK) {
        putError("Failed to create stmt: %s\n", sqlite3_errmsg(this->conn));
        return false;
    }
    bool ret = 1;
    // 2. Bind values to the smtm
    // 3. Execute the smtm
    while ((status = sqlite3_step(stmt)) == SQLITE_ROW) {
        if (!(ret = onRow(stmt, myPtr))) { status = SQLITE_DONE; break; }
    }
    if (status != SQLITE_DONE) {
        ret = false;
        putError("Failed to execute the prepared statement: %s\n",
                sqlite3_errmsg(this->conn));
    }
    // 4. Clean up
    if (sqlite3_finalize(stmt) != SQLITE_OK) {
        printToStdErr("[Warn]: Failed to finalize stmt: %s\n",
                      sqlite3_errmsg(this->conn));
    }
    return ret;
}

sqlite_int64
dbInsert(Db *this, const char *sql, bindValsFn myBindFn, void *data, char *err) {
    // 1. Create a prepared statement
    sqlite_int64 insertId = -1;
    sqlite3_stmt *stmt;
    if (sqlite3_prepare_v2(this->conn, sql, -1, &stmt, NULL) != SQLITE_OK) {
        putError("Failed to create stmt: %s\n", sqlite3_errmsg(this->conn));
        return -1;
    }
    // 2. Call the binder function
    if (!myBindFn(stmt, data)) {
        putError("myBindFn() failed: %s\n", sqlite3_errmsg(this->conn));
        goto done;
    }
    // 3. Execute
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        putError("Failed to execute insert stmt: %s\n", sqlite3_errmsg(this->conn));
        goto done;
    }
    insertId = sqlite3_last_insert_rowid(this->conn);
    // 4. Clean up
    done:
    if (sqlite3_finalize(stmt) != SQLITE_OK) {
        printToStdErr("[Warn]: Failed to finalize stmt: %s\n",
                      sqlite3_errmsg(this->conn));
    }
    return insertId;
}

int
dbUpdate(Db *this, const char *sql, bindValsFn myBindFn, void *myPtr, char *err) {
    // 1. Create a prepared statement
    sqlite3_stmt *stmt;
    int updateRowCount = -1;
    if (sqlite3_prepare_v2(this->conn, sql, -1, &stmt, NULL) != SQLITE_OK) {
        putError("Failed to create stmt: %s\n", sqlite3_errmsg(this->conn));
        return -1;
    }
    // 2. Call the binder function
    if (!myBindFn(stmt, myPtr)) {
        putError("myBindFn() failed: %s\n", sqlite3_errmsg(this->conn));
        goto done;
    }
    // 3. Execute
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        putError("Failed to execute update stmt: %s\n", sqlite3_errmsg(this->conn));
        goto done;
    }
    updateRowCount = sqlite3_changes(this->conn);
    // 4. Clean up
    done:
    if (sqlite3_finalize(stmt) != SQLITE_OK) {
        printToStdErr("[Warn]: Failed to finalize stmt: %s\n",
                      sqlite3_errmsg(this->conn));
    }
    return updateRowCount;
}

bool
dbRunInTransaction(Db *db, const char *statements, char *err) {
    if (statements[strlen(statements) - 1] != ';') {
        putError("statements[strlen(statements) - 1] != ';'.\n");
        return false;
    }
    const char *wrapTmpl = "BEGIN;%sCOMMIT;";
    char sql[strlen(statements) + (strlen(wrapTmpl) - 2) + 1];
    sprintf(sql, wrapTmpl, statements);
    char *sqliteErr = NULL;
    if (sqlite3_exec(db->conn, sql, NULL, NULL, &sqliteErr) != SQLITE_OK) {
        putError("Failed during transaction: %s.\n", sqliteErr);
        sqlite3_free(sqliteErr);
        return false;
    }
    return true;
}
