#include "../include/db.hpp"

bool
Db::open(const std::string &filePath, std::string &err) {
    if (sqlite3_open(filePath.c_str(), &this->conn) != SQLITE_OK) {
        err = "Couldn't open '" + filePath + "': " + sqlite3_errmsg(this->conn);
        return false;
    }
    return true;
}

Db::~Db() {
    if (this->conn) sqlite3_close(this->conn);
}

bool
Db::select(const char *sql, mapRowFn onEachRow, bindValsFn myWhereBindFn,
           void *myPtr, std::string &err) {
    // 1. Create a prepared statement
    sqlite3_stmt *stmt;
    int status = sqlite3_prepare_v2(this->conn, sql, -1, &stmt, NULL);
    if (status != SQLITE_OK) {
        err = "Failed to create stmt: " +
              std::string(sqlite3_errmsg(this->conn));
        return false;
    }
    bool ret = false;
    unsigned i = 0;
    // 2. Call the binder function
    if (myWhereBindFn && !myWhereBindFn(stmt, myPtr)) {
        if (sqlite3_errcode(this->conn) != SQLITE_OK)
            err = "myWhereBindFn() failed: " +
                std::string(sqlite3_errmsg(this->conn));
        // else myBindFn had an non-sqlite error
        goto done;
    }
    // 3. Execute the smtm
    while ((status = sqlite3_step(stmt)) == SQLITE_ROW) {
        if (!(ret = onEachRow(stmt, myPtr, i))) { status = SQLITE_DONE; break; }
        i += 1;
    }
    if (status != SQLITE_DONE) {
        ret = false;
        err = "Failed to execute the prepared statement: " +
              std::string(sqlite3_errmsg(this->conn));
    }
    // 4. Clean up
    done:
    if (sqlite3_finalize(stmt) != SQLITE_OK) {
        std::cerr << "[Warn]: Failed to finalize stmt: " <<
                     sqlite3_errmsg(this->conn) << "\n";
    }
    return ret;
}

sqlite_int64
Db::insert(const char *sql, bindValsFn myBindFn, void *data, std::string &err) {
    // 1. Create a prepared statement
    sqlite_int64 insertId = -1;
    sqlite3_stmt *stmt;
    if (sqlite3_prepare_v2(this->conn, sql, -1, &stmt, NULL) != SQLITE_OK) {
        err = "Failed to create stmt: " +
              std::string(sqlite3_errmsg(this->conn));
        return -1;
    }
    // 2. Call the binder function
    if (!myBindFn(stmt, data)) {
        if (sqlite3_errcode(this->conn) != SQLITE_OK)
            err = "myBindFn() failed: " +
                std::string(sqlite3_errmsg(this->conn));
        // else myBindFn had an non-sqlite error
        goto done;
    }
    // 3. Execute
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        err = "Failed to execute insert stmt: " +
            std::string(sqlite3_errmsg(this->conn));
        goto done;
    }
    insertId = sqlite3_last_insert_rowid(this->conn);
    // 4. Clean up
    done:
    if (sqlite3_finalize(stmt) != SQLITE_OK) {
        std::cerr << "[Warn]: Failed to finalize stmt: " <<
                     sqlite3_errmsg(this->conn) << "\n";
    }
    return insertId;
}

int
Db::update(const char *sql, bindValsFn myBindFn, void *myPtr, std::string &err) {
    // 1. Create a prepared statement
    sqlite3_stmt *stmt;
    int out = -1;
    if (sqlite3_prepare_v2(this->conn, sql, -1, &stmt, NULL) != SQLITE_OK) {
        err = "Failed to create stmt: " +
            std::string(sqlite3_errmsg(this->conn));
        return -1;
    }
    // 2. Call the binder function
    if (!myBindFn(stmt, myPtr)) {
        if (sqlite3_errcode(this->conn) != SQLITE_OK)
            err = "myBindFn() failed: " +
                std::string(sqlite3_errmsg(this->conn));
        // else myBindFn had an non-sqlite error
        goto done;
    }
    // 3. Execute
    if (sqlite3_step(stmt) == SQLITE_DONE) {
        out = sqlite3_changes(this->conn);
    } else {
        err = "Failed to execute update stmt: " +
            std::string(sqlite3_errmsg(this->conn));
        goto done;
    }
    // 4. Clean up
    done:
    if (sqlite3_finalize(stmt) != SQLITE_OK) {
        std::cerr << "[Warn]: Failed to finalize stmt: " <<
                     sqlite3_errmsg(this->conn) << "\n";
    }
    return out;
}

bool
Db::runInTransaction(std::string statements, std::string &err) {
    statements = "BEGIN;" + statements + (statements.back() == ';' ? "COMMIT;" : ";COMMIT;");
    const char *execErr = nullptr;
    if (sqlite3_exec(this->conn, statements.c_str(), nullptr, nullptr,
                     (char**)(&execErr)) != SQLITE_OK) {
        err = "Failed during transaction: " + std::string(execErr) + ".\n";
        sqlite3_free((void*)execErr);
        return false;
    }
    return true;
}
