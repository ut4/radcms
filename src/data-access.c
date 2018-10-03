#include "../include/data-access.h"

// == DataBatchConfig ====
// =============================================================================
DataBatchConfig *dataBatchConfigCreate(const char *contentType, bool doFetchAll, int id) {
    DataBatchConfig *out = ALLOCATE(DataBatchConfig, 1);
    out->contentType = contentType;
    out->doFetchAll = doFetchAll;
    out->id = id;
    return out;
}
void dataBatchConfigDestruct(DataBatchConfig *dbc) {
    FREE(dbc);
}
void dataBatchConfigUsing(DataBatchConfig *dbc, const char *renderUsing) {
    dbc->renderUsing = renderUsing;
}
void dataBatchConfigOrderBy(DataBatchConfig *dbc, const char *order) {
    dbc->orderIsAsc = strcmp(order, "Asc") == 0;
}
void dataBatchConfigWhere(DataBatchConfig *dbc) {
    // todo
}

// == DataBatchConfigArray ====
// =============================================================================
void dataBatchConfigArrayInit(DataBatchConfigArray *array) {
    array->values = NULL;
    array->capacity = 0;
    array->length = 0;
}
void dataBatchConfigArrayPush(DataBatchConfigArray *array, DataBatchConfig value) {
    if (array->capacity < array->length + 1) {
        int oldCapacity = array->capacity;
        array->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        array->values = ARRAY_GROW(array->values, DataBatchConfig,
                                   oldCapacity, array->capacity);
    }
    array->values[array->length] = value;
    array->length++;
}
void dataBatchConfigArrayDestruct(DataBatchConfigArray *array) {
    ARRAY_FREE(DataBatchConfig, array->values, array->capacity);
    dataBatchConfigArrayInit(array);
}

// == DocumentDataConfig ====
// =============================================================================
void documentDataConfigInit(DocumentDataConfig *ddc) {
    ddc->batchIdCounter = 0;
    dataBatchConfigArrayInit(&ddc->batches);
}
void documentDataConfigDestruct(DocumentDataConfig *ddc) {
    dataBatchConfigArrayDestruct(&ddc->batches);
}
