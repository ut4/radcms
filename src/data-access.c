#include "../include/data-access.h"
#include <stdio.h>

// == DataBatchConfig ====
// =============================================================================
DataBatchConfig *dataBatchConfigCreate(const char *contentType, bool doFetchAll, int id) {
    DataBatchConfig *out = ALLOCATE(DataBatchConfig, 1);
    out->contentType = copyString(contentType);
    out->renderUsing = NULL;
    out->where = NULL;
    out->orderIsAsc = false;
    out->doFetchAll = doFetchAll;
    out->id = id;
    out->next = NULL;
    return out;
}
void dataBatchConfigDestruct(DataBatchConfig *this) {
    FREE(this->contentType);
    FREE(this->renderUsing);
    FREE(this);
}
void dataBatchConfigUsing(DataBatchConfig *this, const char *renderUsing) {
    this->renderUsing = copyString(renderUsing);
}
void dataBatchConfigOrderBy(DataBatchConfig *this, const char *order) {
    this->orderIsAsc = strcmp(order, "Asc") == 0;
}
void dataBatchConfigWhere(DataBatchConfig *this, const char *where) {
    // todo
}

// == DocumentDataConfig ====
// =============================================================================
void documentDataConfigInit(DocumentDataConfig *this) {
    this->batchIdCounter = 0;
    this->batches = NULL;
}
void documentDataConfigDestruct(DocumentDataConfig *this) {
    //
}
DataBatchConfig *documentDataConfigAddBatch(DocumentDataConfig *this,
                                            const char *contentType,
                                            bool isFetchAll) {
    DataBatchConfig *newBatchConfig = dataBatchConfigCreate(
        contentType, isFetchAll, this->batchIdCounter);
    DataBatchConfig *ret;
    if (!this->batches) {
        this->batches = newBatchConfig;
        ret = this->batches;
    } else {
        DataBatchConfig *cur = this->batches;
        while (cur->next) cur = cur->next;
        cur->next = newBatchConfig;
        ret = cur->next;
    }
    this->batchIdCounter++;
    return ret;
}
