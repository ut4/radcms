#include "../include/data-queries.h"

void
documentDataConfigInit(DocumentDataConfig *this) {
    this->batches.componentTypeName = NULL;
    this->batches.isFetchAll = false;
    this->batches.id = 0;
    this->batches.renderWith = NULL;
    this->batches.where = NULL;
    this->batches.next = NULL;
    this->batchHead = NULL;
    //
    this->batchCount = 0;
    this->finalSql = NULL;
}

void
documentDataConfigDestruct(DocumentDataConfig *this) {
    if (this->finalSql) FREE_STR(this->finalSql);
    if (this->batches.componentTypeName) dataBatchConfigDestruct(&this->batches);
    if (!this->batches.next) return;
    DataBatchConfig *head = this->batches.next;
    DataBatchConfig *tmp;
    while (head != NULL) {
        tmp = head;
        head = head->next;
        dataBatchConfigDestruct(tmp);
        FREE(DataBatchConfig, tmp);
    }
}

DataBatchConfig*
documentDataConfigAddBatch(DocumentDataConfig *this, const char *componentTypeName,
                           bool isFetchAll) {
    if (this->batchHead) {
        DataBatchConfig *newBatchConfig = ALLOCATE(DataBatchConfig);
        dataBatchConfigInit(newBatchConfig, componentTypeName, isFetchAll,
                            this->batchCount + 1);
        this->batchHead->next = newBatchConfig;
        this->batchHead = newBatchConfig;
    } else {
        dataBatchConfigInit(&this->batches, componentTypeName, isFetchAll,
                            this->batchCount + 1);
        this->batchHead = &this->batches;
    }
    this->batchCount += 1;
    return this->batchHead;
}

static size_t
doSingle(DataBatchConfig *cur, char **wheres, unsigned i) {
    wheres[i] = cur->where;
    return strlen(cur->where);
}

char*
documentDataConfigToSql(DocumentDataConfig *this, char *err) {
    if (!this->batchHead) {
        putError("Can't generate from empty config.\n");
        return NULL;
    }
    #define MAIN_SELECT_TMPL "select `id`,`name`,`json` from (%s)"
    #define BATCH_SELECT_TMPL "select * from (" \
                                "select `id`,`name`,`json` from components where %s" \
                            ")"
    #define BATCH_SELECT_TMPL_N " union all "BATCH_SELECT_TMPL
    const unsigned batchWrapStrLen = strlen(BATCH_SELECT_TMPL) - 2; // 2 == %s
    const unsigned unionAllStrLen = strlen(" union all ");
    /*
     * Collect each batch, and calculate their total character count
     */
    char* wheres[this->batchCount];
    DataBatchConfig *cur = &this->batches;
    unsigned wrappedBatchesStrLen = unionAllStrLen * (this->batchCount - 1);
    unsigned i = 0;
    while (cur) {
        if (cur->where && !cur->isFetchAll) {
            wrappedBatchesStrLen += batchWrapStrLen + doSingle(cur, wheres, i);
        } else {
            printToStdErr("Not implemented yet.");
            exit(EXIT_FAILURE);
        }
        i += 1;
        cur = cur->next;
    }
    /*
     * Concatenate each batch eg. select * from (<first batch>) union all
     *                            select * from (<second batch>) ...
     */
    char wrappedBatches[wrappedBatchesStrLen + 1];
    wrappedBatches[0] = '\0';
    unsigned nthWhere = 0;
    for (i = 0; i < this->batchCount; ++i) {
        if (!wheres[i]) continue;
        if (nthWhere > 0) {
            char wrappedBatch[unionAllStrLen + batchWrapStrLen + strlen(wheres[i]) + 1];
            sprintf(wrappedBatch, BATCH_SELECT_TMPL_N, wheres[i]);
            strcat(wrappedBatches, wrappedBatch);
        } else {
            char wrappedBatch[batchWrapStrLen + strlen(wheres[i]) + 1];
            sprintf(wrappedBatch, BATCH_SELECT_TMPL, wheres[i]);
            strcat(wrappedBatches, wrappedBatch);
        }
        nthWhere += 1;
    }
    /*
     * Wrap the batches inside the main query and return
     */
    this->finalSql = ALLOCATE_ARR(char, strlen(MAIN_SELECT_TMPL) - 2 + // 2 == %s
                                  wrappedBatchesStrLen + 1);
    sprintf(this->finalSql, MAIN_SELECT_TMPL, wrappedBatches);
    return this->finalSql;
}

void
dataBatchConfigInit(DataBatchConfig *this, const char *componentTypeName,
                    bool isFetchAll, unsigned id) {
    this->componentTypeName = copyString(componentTypeName);
    this->isFetchAll = isFetchAll;
    this->id = id;
    this->renderWith = NULL;
    this->where = NULL;
    this->next = NULL;
}

void
dataBatchConfigDestruct(DataBatchConfig *this) {
    FREE_STR(this->componentTypeName);
    if (this->renderWith) FREE_STR(this->renderWith);
    if (this->where) FREE_STR(this->where);
}

void
dataBatchConfigSetRenderWith(DataBatchConfig *this, const char *renderWith) {
    this->renderWith = copyString(renderWith);
}

void
dataBatchConfigSetWhere(DataBatchConfig *this, const char *where) {
    this->where = copyString(where);
}
