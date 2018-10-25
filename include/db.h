#ifndef insn_db_h
#define insn_db_h

#include <string.h> // strlen
#include <sqlite3.h>
#include "common.h"

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
 * see dbSelect().
 */
typedef void (*mapRowFn)(sqlite3_stmt *stmt, void **myPtr);

/**
 * Usage:
 * void myMapFn(sqlite3_stmt *stmt, void **myPtr) {
 *     // todo
 * }
 * if (dbSelect(db, "SELECT * FROM foo limit 1", myMapFn, (void*)&myData, err)) {
 *     // ok, each row was passed to myMapFn
 * }
 */
bool
dbSelect(Db *this, const char *sql, mapRowFn onRow, void **onRowCtx, char *err);

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