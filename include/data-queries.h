#ifndef insn_dataQueries_h
#define insn_dataQueries_h

#include <math.h> // log10
#include "memory.h"

#define DBC_MAX_CMP_TYPE_NAME_LEN 64
#define DBC_MAX_WHERE_LEN 2048
#define DBC_MAX_TMPL_VAR_NAME_LEN 256

typedef enum {
    DBC_CMP_TYPE_NAME_TOO_LONG = 1 << 0,
    DBC_WHERE_REQUIRED         = 1 << 1,
    DBC_WHERE_TOO_LONG         = 1 << 2,
    DBC_TMPL_VAR_NAME_TOO_LONG = 1 << 3,
} DataBatchConfigErrors;

struct DataBatchConfig;
typedef struct DataBatchConfig DataBatchConfig;
// Holds a single fetchOne|All() configuration.
struct DataBatchConfig {
    char *componentTypeName; // select from components where type = $componentTypeName
    bool isFetchAll;         // true = select multiple records, false = select one record only
    unsigned id;
    unsigned errors;
    char *tmplVarName;       // Name of the result variable
    char *where;             // WHERE-portion of the query
    DataBatchConfig *next;
};

void
dataBatchConfigInit(DataBatchConfig *this, const char *componentTypeName,
                    bool isFetchAll, unsigned id);

void
dataBatchConfigFreeProps(DataBatchConfig *this);

void
dataBatchConfigSetTmplVarName(DataBatchConfig *this, const char *varName);

void
dataBatchConfigSetWhere(DataBatchConfig *this, const char *where);

size_t
dataBatchConfigGetToStringLen(DataBatchConfig *this);

void
dataBatchConfigToString(DataBatchConfig *this, char *to);

// Holds the fetchOne|All() configurations of a single document/layout/vTree.
typedef struct {
    DataBatchConfig batches; // Linked list
    DataBatchConfig *batchHead;
    unsigned batchCount;
    char *finalSql;
} DocumentDataConfig;

void
documentDataConfigInit(DocumentDataConfig *this);

void
documentDataConfigFreeProps(DocumentDataConfig *this);

/**
 * Appends a new DataBatchConfig to $this->batches, and returns a pointer to it.
 */
DataBatchConfig*
documentDataConfigAddBatch(DocumentDataConfig *this, const char *componentTypeName,
                           bool isFetchAll);

/**
 * Transforms $this into an sql query. Example output:
 *
 * select id, name, json from (
 *     select * from (<batch1>) union all
 *     select * from (<batch2>) union all
 *     select * from (<batch3>) ...
 *     ...
 * )
 */
char*
documentDataConfigToSql(DocumentDataConfig *this, char *err);

/**
 * Returns DataBatchConfig*|NULL.
 */
// @unused
DataBatchConfig*
documentDataConfigFindBatch(DocumentDataConfig *this, unsigned id);

#endif