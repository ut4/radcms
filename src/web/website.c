#include "../../include/web/website.h"

static void mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr);
static void mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr);

void
websiteInit(Website *this) {
    this->siteGraph.capacity = 0;
    this->siteGraph.length = 0;
    this->siteGraph.values = NULL;
    this->rootDir = NULL;
    this->dukCtx = NULL;
    this->db = NULL;
}

void
websiteFreeProps(Website *this) {
    if (this->siteGraph.values) pageArrayFreeProps(&this->siteGraph);
    this->rootDir = NULL;
    this->dukCtx = NULL;
    this->db = NULL;
}

bool
websiteFetchAndParseSiteGraph(Website *this, char *err) {
    char *serializedGraphFromDb = NULL;
    if (dbSelect(this->db, "SELECT graph FROM websites LIMIT 1",
                 mapSiteGraphResultRow, (void*)&serializedGraphFromDb, err)) {
        if (!serializedGraphFromDb) return false;
        bool ok = siteGraphParse(serializedGraphFromDb, &this->siteGraph,
                                 &this->strReader, err);
        FREE_STR(serializedGraphFromDb);
        return ok;
    }
    return false;
}

bool
websiteFetchBatches(Website *this, DocumentDataConfig *ddc, ComponentArray *to,
                    char *err) {
    componentArrayInit(to);
    char *sql = documentDataConfigToSql(ddc, err);
    return sql &&
           dbSelect(this->db, sql, mapDataBatchesRow, (void*)&to, err) &&
           to->length > 0;
}

static void
mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr) {
    *myPtr = copyString((const char*)sqlite3_column_text(stmt, 0));
}

static void
mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr) {
    ComponentArray *arr = (ComponentArray*)*myPtr;
    Component newComponent;
    componentInit(&newComponent);
    newComponent.id = (unsigned)sqlite3_column_int(stmt, 0);
    newComponent.name = copyString((const char*)sqlite3_column_text(stmt, 1));
    newComponent.json = copyString((const char*)sqlite3_column_text(stmt, 2));
    newComponent.dataBatchConfigId = (unsigned)sqlite3_column_int(stmt, 3);
    componentArrayPush(arr, &newComponent);
}

bool
siteGraphParse(char *str, PageArray *out, StrReader *sr, char *err) {
    if (!strReaderIsDigit(str[0])) {
        putError("ParseError: Expected a digit but got '%c'.\n", str[0]);
        return false;
    }
    strReaderInit(sr, str, '|');
    unsigned totalPageCount = strReaderReadInt(sr);
    pageArrayInit(out, totalPageCount);
    while (*sr->current != '\0') {
        if (strReaderIsDigit(*sr->current)) {
            Page newPage = {
                .id = strReaderReadInt(sr),
                .url = strReaderReadStr(sr),
                .parentId = strReaderReadInt(sr),
                .layoutFileName = strReaderReadStr(sr)
            };
            pageArrayPush(out, &newPage);
        } else {
            putError("Unpexted character '%c'.\n", *sr->current);
            return false;
        }
    }
    return true;
}

void
siteGraphSerialize(PageArray *siteGraph, char *to) {

}

Page*
siteGraphFindPage(PageArray *siteGraph, const char *url) {
    for (unsigned i = 0; i < siteGraph->length; ++i) {
        if (strcmp(siteGraph->values[i].url, url) == 0) {
            return &siteGraph->values[i];
        }
    }
    return NULL;
}

void
pageArrayInit(PageArray *this, unsigned capacity) {
    this->capacity = capacity;
    this->length = 0;
    this->values = ALLOCATE_ARR(Page, capacity);
}
void
pageArrayPush(PageArray *this, Page *page) {
    this->values[this->length] = *page;
    this->length++;
}
void
pageArrayFreeProps(PageArray *this) {
    for (unsigned i = 0; i < this->capacity; ++i) {
        FREE_STR(this->values[i].url);
        FREE_STR(this->values[i].layoutFileName);
    }
    FREE_ARR(Page, this->values, this->capacity);
    this->values = NULL;
    this->length = 0;
}
