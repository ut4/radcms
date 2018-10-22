#ifndef insn_dataQueries_h
#define insn_dataQueries_h

#include <math.h> // log10
#include "memory.h"

struct DataBatchConfig;
typedef struct DataBatchConfig DataBatchConfig;
// Holds a single renderOne|All() configuration.
struct DataBatchConfig {
    char *componentTypeName; // select from components where type = $componentTypeName
    bool isFetchAll;         // true = select multiple records, false = select one record only
    unsigned id;
    char *renderWith;        // Name of the (JSX-)template file
    char *where;             // WHERE-portion of the query
    DataBatchConfig *next;
};

void
dataBatchConfigInit(DataBatchConfig *this, const char *componentTypeName,
                    bool isFetchAll, unsigned id);

void
dataBatchConfigFreeProps(DataBatchConfig *this);

void
dataBatchConfigSetRenderWith(DataBatchConfig *this, const char *renderWith);

void
dataBatchConfigSetWhere(DataBatchConfig *this, const char *where);

// Holds the renderOne|All() configurations of a single document/layout/vTree.
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
// TAG not-used
DataBatchConfig*
documentDataConfigFindBatch(DocumentDataConfig *this, unsigned id);

#endif