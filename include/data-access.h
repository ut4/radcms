#ifndef rad3_dataAccess_h
#define rad3_dataAccess_h

#include <stdbool.h>
#include <string.h> // NULL
#include "memory.h" // ALLOCATE, ARRAY_*

// == DataBatchConfig ====
// =============================================================================
struct DataBatchConfig;
typedef struct DataBatchConfig DataBatchConfig;
struct DataBatchConfig{
    char *contentType;
    char *renderUsing;
    char *where;
    bool orderIsAsc;
    bool doFetchAll;
    int id;
    DataBatchConfig* next;
};

DataBatchConfig *dataBatchConfigCreate(const char *contentType, bool doFetchAll, int id);
void dataBatchConfigDestruct(DataBatchConfig *this);
void dataBatchConfigUsing(DataBatchConfig *this, const char *renderUsing);
void dataBatchConfigOrderBy(DataBatchConfig *this, const char *order);
void dataBatchConfigWhere(DataBatchConfig *this, const char *where);
DataBatchConfig *dataBatchConfigLinkedListAdd(DataBatchConfig *root,
                                              DataBatchConfig *itemToAdd);

struct DataBatchConfigRefListNode;
typedef struct DataBatchConfigRefListNode DataBatchConfigRefListNode;
struct DataBatchConfigRefListNode {
    DataBatchConfig *ref;
    DataBatchConfigRefListNode *next;
};

// == DocumentDataConfig ====
// =============================================================================
typedef struct {
    int batchIdCounter;
    DataBatchConfig *batches;
} DocumentDataConfig;

void documentDataConfigInit(DocumentDataConfig *this);
void documentDataConfigDestruct(DocumentDataConfig *this);
DataBatchConfig *documentDataConfigAddBatch(DocumentDataConfig *this,
                                            const char *contentType,
                                            bool isFetchAll);
#define documentDataConfigRenderAll(this, contentType) \
    documentDataConfigAddBatch(this, contentType, true)
#define documentDataConfigRenderOne(this, contentType) \
    documentDataConfigAddBatch(this, contentType, false)

// == DataRepository ====
// =============================================================================
void dataRepositoryFetchAll();

#endif