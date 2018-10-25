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
documentDataConfigFreeProps(DocumentDataConfig *this) {
    if (this->finalSql) FREE_STR(this->finalSql);
    if (this->batches.componentTypeName) dataBatchConfigFreeProps(&this->batches);
    if (!this->batches.next) return;
    DataBatchConfig *head = this->batches.next;
    DataBatchConfig *tmp;
    while (head != NULL) {
        tmp = head;
        head = head->next;
        dataBatchConfigFreeProps(tmp);
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

char*
documentDataConfigToSql(DocumentDataConfig *this, char *err) {
    if (!this->batchHead) {
        putError("Can't generate from empty config.\n");
        return NULL;
    }
    #define MAIN_SELECT_TMPL "select `id`,`name`,`json`,`dbcId` from (%s)"
    #define BATCH_SELECT_TMPL "select * from (" \
                                "select `id`,`name`,`json`,%u as `dbcId` " \
                                "from components where %s" \
                              ")"
    #define TYPE_FILTER_TMPL "`componentTypeId` = (select `id` from " \
                             "componentTypes where `name` = '%s')"
    #define BATCH_SELECT_TMPL_N " union all "BATCH_SELECT_TMPL
    const unsigned batchWrapTmplStrLen = strlen(BATCH_SELECT_TMPL) - 4; // 4 == %u%s
    const unsigned unionAllStrLen = strlen(" union all ");
    const unsigned typeFilterTmplStrLen = strlen(TYPE_FILTER_TMPL) - 2; // 2 == %s
    /*
     * Collect each batch, and calculate their total character count
     */
    unsigned totalBatchesLength = 0;
    unsigned batchLengths[this->batchCount];
    DataBatchConfig *cur = &this->batches;
    unsigned i = 0;
    while (cur) {
        unsigned varying = 0;
        if (cur->where && !cur->isFetchAll) {
            varying += strlen(cur->where);
        } else if (cur->isFetchAll) {
            unsigned l = typeFilterTmplStrLen + strlen(cur->componentTypeName);
            varying += l;
            cur->where = ALLOCATE_ARR(char, l + 1);
            sprintf(cur->where, TYPE_FILTER_TMPL, cur->componentTypeName);
        } else {
            printToStdErr("Not implemented yet.");
            exit(EXIT_FAILURE);
        }
        batchLengths[i] = batchWrapTmplStrLen +          // select * from (select `id`...
                          (i > 0 ? unionAllStrLen : 0) + // union all
                          (log10(cur->id) + 1) +         // 1 or 452 (as `dbcId`)
                          varying;                       // foo="bar"
        totalBatchesLength += batchLengths[i];
        i += 1;
        cur = cur->next;
    }
    /*
     * Concatenate each batch eg. select * from (<first batch>) union all
     *                            select * from (<second batch>) ...
     */
    char wrappedBatches[totalBatchesLength + 1];
    wrappedBatches[0] = '\0';
    cur = &this->batches;
    i = 0;
    while (cur) {
        char *tmpl = i > 0 ? BATCH_SELECT_TMPL_N : BATCH_SELECT_TMPL;
        char wrappedBatch[batchLengths[i] + 1];
        sprintf(wrappedBatch, tmpl, cur->id, cur->where);
        strcat(wrappedBatches, wrappedBatch);
        cur = cur->next;
        i += 1;
    }
    /*
     * Wrap the batches inside the main query and return
     */
    this->finalSql = ALLOCATE_ARR(char, strlen(MAIN_SELECT_TMPL) - 2 + // 2 == %s
                                  totalBatchesLength + 1);
    sprintf(this->finalSql, MAIN_SELECT_TMPL, wrappedBatches);
    return this->finalSql;
}

DataBatchConfig*
documentDataConfigFindBatch(DocumentDataConfig *this, unsigned id) {
    if (!this->batches.componentTypeName) { return NULL; }
    DataBatchConfig *cur = &this->batches;
    while (cur) {
        if (cur->id == id) { return cur; }
        cur = cur->next;
    }
    return NULL;
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
dataBatchConfigFreeProps(DataBatchConfig *this) {
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

size_t
dataBatchConfigGetToStringLen(DataBatchConfig *this) {
    return strlen("render(\"\")") +
           3 + // All|One
           strlen(this->componentTypeName) +
           (this->where ? strlen(".where(\"\")") + strlen(this->where) : 0) +
           1; // \0
}

void
dataBatchConfigToString(DataBatchConfig *this, char *to) {
    to[0] = '\0';
    sprintf(to, "render%s(\"%s\")",
        this->isFetchAll ? "All" : "One",
        this->componentTypeName
    );
    if (this->where) {
        strcat(to, ".where(\"");
        strcat(to, this->where);
        strcat(to, "\")");
    }
    strcat(to, ".using(\"");
    strcat(to, this->renderWith);
    strcat(to, "\")");
}
