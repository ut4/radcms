#ifndef insn_db_h
#define insn_db_h

#include <string.h> // strlen
#include <sqlite3.h>
#include "common/common.h"

typedef struct {
    sqlite3 *conn;
} Db;

/**
 * Initializes $this. Doesn't open any connections yet.
 */
void
dbInit(Db *this);

/**
 * Allocates and opens an SQLite connection $this->conn.
 */
bool
dbOpen(Db *this, const char *filePath, char *err);

/**
 * Closes and frees $this->conn.
 */
void
dbDestruct(Db *this);

/**
 * see dbInsert().
 */
typedef bool (*bindValsFn)(sqlite3_stmt *stmt, void *myPtr);

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
 * sqlite_int64 insertId = dbInsert(db, "insert into foo values(?, ?, ?)", myBindFn, &data, err);
 * if (insertId > 0) {
 *     // ok, each ? was bound and the query ran succesfully
 * } // else if (insertId == -1) printf("Something went wrong %s", err);
 */
sqlite_int64
dbInsert(Db *this, const char *sql, bindValsFn myBindFn, void *data, char *err);

/**
 * see dbSelect().
 *
 * @param {sqlite3_stmt} *stmt
 * @param {void} *myPtr
 * @param {unsigned} nthRow Current row index, zero-based
 */
typedef bool (*mapRowFn)(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow);

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
 * if (dbSelect(db, "SELECT * FROM foo limit 1", myMapFn, &data, err)) {
 *     // ok, each row was passed to myMapFn
 * }
 */
bool
dbSelect(Db *this, const char *sql, mapRowFn onRow, void *myPtr, char *err);

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
 * int numAffectedRows = dbUpdate(db, sql, myBindFn, &filter, err);
 * if (numAffectedRows > -1) {
 *     // ok, each ? was bound and the query ran succesfully
 * } // else if (numAffectedRows == -1) printf("Something went wrong %s", err);
 */
int
dbUpdate(Db *this, const char *sql, bindValsFn myBindFn, void *myPtr, char *err);

/**
 * Example: dbRunInTransaction(db,
 *   "drop table if exists foo; "
 *   "create table foo ( prop text );",
 *   errBuf
 * );
 */
bool
dbRunInTransaction(Db *db, const char *statements, char *err);

#endif