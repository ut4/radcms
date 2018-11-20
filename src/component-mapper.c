#include "../include/component-mapper.h"

static bool
bindInsertStmtVals(sqlite3_stmt *stmt, void *data);

int
componentMapperInsertComponent(Db *db, ComponentFormData *fdata, char *err) {
    if (!fdata->cmp.name) {
        setError(fdata->errors, CMP_NAME_REQUIRED);
    }
    if (!fdata->cmp.json) {
        setError(fdata->errors, CMP_JSON_REQUIRED);
    }
    if (fdata->cmp.componentTypeId == 0) {
        setError(fdata->errors, CMP_COMPONENT_TYPE_ID_REQUIRED);
    }
    if (hasErrors(fdata->errors)) {
        return -1;
    }
    char *sql = "insert into components (`name`, `json`, `componentTypeId`) "
                "values (?, ?, ?)";
    return (int)dbInsert(db, sql, bindInsertStmtVals, &fdata->cmp, err);
}

static bool
bindInsertStmtVals(sqlite3_stmt *stmt, void *data) {
    Component *d = data;
    if (sqlite3_bind_text(stmt, 1, d->name, -1, SQLITE_STATIC) != SQLITE_OK) return false;
    if (sqlite3_bind_text(stmt, 2, d->json, -1, SQLITE_STATIC) != SQLITE_OK) return false;
    if (sqlite3_bind_int(stmt, 3, d->componentTypeId) != SQLITE_OK) return false;
    return true;
}
