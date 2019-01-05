#pragma once

#include <iostream>
#include <string>
#include <sqlite3.h>

/**
 * see dbInsert().
 */
typedef bool (*bindValsFn)(sqlite3_stmt *stmt, void *myPtr);

/**
 * see dbSelect().
 *
 * @param {sqlite3_stmt} *stmt
 * @param {void} *myPtr
 * @param {unsigned} nthRow Current row index, zero-based
 */
typedef bool (*mapRowFn)(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow);

struct Db {
    sqlite3 *conn = nullptr;
    /**
     * Allocates and opens an SQLite connection $this->conn.
     */
    bool
    open(const std::string &filePath, std::string &err);
    /**
     * Closes and frees $this->conn.
     */
    ~Db();
    /**
     * Usage:
     * bool myBindFn(sqlite3_stmt *stmt, void *data) {
     *     MyData *d = data;
     *     if (sqlite3_bind_text(stmt, 1, d->prop, -1, SQLITE_STATIC) != SQLITE_OK) return false;
     *     if (sqlite3_bind_text(stmt, 2, d->prop2, -1, SQLITE_STATIC) != SQLITE_OK) return false;
     *     if (sqlite3_bind_int(stmt, 3, d->another) != SQLITE_OK) return false;
     *     return true;
     * }
     * MyData data;
     * sqlite_int64 insertId = db.insert("insert into foo values(?, ?, ?)", myBindFn, &data, err);
     * if (insertId > 0) {
     *     // ok, each ? was bound and the query ran succesfully
     * } // else if (insertId == -1) printf("Something went wrong %s", err);
     */
    sqlite_int64
    insert(const char *sql, bindValsFn myBindFn, void *data, std::string &err);
    /**
     * Usage:
     * bool myMapFn(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow) {
     *     MyData *d = ALLOCATE(MyData);
     *     d->prop = copyString((const char*)sqlite3_column_text(stmt, 0));
     *     d->prop2 = copyString((const char*)sqlite3_column_text(stmt, 1));
     *     d->another = sqlite3_column_int(stmt, 2);
     *     *((MyData**)myPtr) = d; // or pushToSomeArray(myPtr, d);
     *     return true; // true == keep going, false == stop
     * }
     * MyData *data = NULL;
     * if (db.select("SELECT * FROM foo limit 1", myMapFn, &data, err)) {
     *     // ok, each row was passed to myMapFn
     * }
     */
    bool
    select(const char *sql, mapRowFn onRow, void *myPtr, std::string &err);
    /**
     * Usage:
     * bool myBindFn(sqlite3_stmt *stmt, void *myPtr) {
     *     MyFilter *filters = myPtr;
     *     MyData *d = filters->data;
     *     if (sqlite3_bind_text(stmt, 1, d->prop, -1, SQLITE_STATIC) != SQLITE_OK) return false;
     *     if (sqlite3_bind_text(stmt, 2, d->prop2, -1, SQLITE_STATIC) != SQLITE_OK) return false;
     *     if (sqlite3_bind_int(stmt, 3, d->another) != SQLITE_OK) return false;
     *     if (sqlite3_bind_int(stmt, 4, filters->val) != SQLITE_OK) return false;
     *     return true;
     * }
     * MyFilter filter;
     * const char *sql = "update foo set prop = ?, prop2 = ?, another = ? where foo = ?";
     * int numAffectedRows = db.update(sql, myBindFn, &filter, err);
     * if (numAffectedRows > -1) {
     *     // ok, each ? was bound and the query ran succesfully
     * } // else if (numAffectedRows == -1) printf("Something went wrong %s", err);
     */
    int
    update(const char *sql, bindValsFn myBindFn, void *myPtr, std::string &err);
    /**
     * Example: db.runInTransaction(
     *   "drop table if exists foo; "
     *   "create table foo ( prop text );",
     *   errBuf
     * );
     */
    bool
    runInTransaction(std::string statements, std::string &err);
};
