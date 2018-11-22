#ifndef insn_componentMapper_h
#define insn_componentMapper_h

#include "db.h"
#include "data-defs.h"

typedef enum {
    CMP_NAME_REQUIRED = 1 << 0,
    CMP_JSON_REQUIRED = 1 << 1,
    CMP_COMPONENT_TYPE_ID_REQUIRED = 1 << 2,
} FormDataErrors;

/*
 * Used on every POST /api/component.
 */
typedef struct {
    Component cmp;
    unsigned errors;
} ComponentFormData;

/**
 * Validates $fdata->cmp, inserts it to the database and returns
 * sqlite3_last_insert_rowid, or returns -1 (and sets $fdata->errors).
 */
int
componentMapperInsertComponent(Db *db, ComponentFormData *fdata, char *err);

#endif