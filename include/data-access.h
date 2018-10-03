#ifndef rad3_dataAccess_h
#define rad3_dataAccess_h

#include <stdbool.h>
#include <string.h> // NULL
#include "memory.h" // ALLOCATE, ARRAY_*

// == DataBatchConfig ====
// =============================================================================
typedef struct {
    const char *contentType;
    const char *renderUsing;
    bool orderIsAsc;
    bool doFetchAll;
    int id;
} DataBatchConfig;

DataBatchConfig *dataBatchConfigCreate(const char *contentType, bool doFetchAll, int id);
void dataBatchConfigDestruct(DataBatchConfig *dbc);
void dataBatchConfigUsing(DataBatchConfig *dbc, const char *renderUsing);
void dataBatchConfigOrderBy(DataBatchConfig *dbc, const char *order);
void dataBatchConfigWhere(DataBatchConfig *dbc);

// == DataBatchConfigArray ====
// =============================================================================
typedef struct {
    int capacity;
    int length;
    DataBatchConfig* values;
} DataBatchConfigArray;

void dataBatchConfigArrayInit(DataBatchConfigArray *array);
void dataBatchConfigArrayPush(DataBatchConfigArray *array, DataBatchConfig value);
void dataBatchConfigArrayDestruct(DataBatchConfigArray *array);

// == DocumentDataConfig ====
// =============================================================================
typedef struct {
    int batchIdCounter;
    DataBatchConfigArray batches;
} DocumentDataConfig;

void documentDataConfigInit(DocumentDataConfig *ddc);
void documentDataConfigDestruct(DocumentDataConfig *ddc);

#endif