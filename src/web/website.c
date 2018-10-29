#include "../../include/web/website.h"

static void mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr);
static void mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr);

void
websiteInit(Website *this) {
    siteGraphInit(&this->siteGraph);
    this->rootDir = NULL;
    this->dukCtx = NULL;
    this->db = NULL;
}

void
websiteFreeProps(Website *this) {
    siteGraphFreeProps(&this->siteGraph);
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
websitePopulateTemplateCaches(Website *this, char *err) {
    TextNodeArray *tmpls = &this->siteGraph.tmplFiles;
    duk_push_thread_stash(this->dukCtx, this->dukCtx);         // [... stash]
    for (unsigned i = 0; i < tmpls->length; ++i) {
        /*
         * Read contents from disk
         */
        STR_CONCAT(tmplFilePath, this->rootDir, tmpls->values[i].chars);
        char *code = fileIOReadFile(tmplFilePath, err);
        if (!code) return false;
        /*
         * Compile string -> function
         */
        if (dukUtilsCompileStrToFn(this->dukCtx, code, err)) { // [... stash fn]
            /*
             * Convert function -> bytecode
             */
            duk_dump_function(this->dukCtx);                   // [... stash bytecode]
            duk_size_t bytecodeSize = 0;
            (void)duk_get_buffer(this->dukCtx, -1, &bytecodeSize);
            /*
             * Store the bytecode to the thread stash
             */
            if (bytecodeSize > 0) {
                duk_put_prop_string(this->dukCtx, -2, tmpls->values[i].chars); // [... stash]
            } else {
                printToStdErr("Failed to cache '%s'. Rage quitting.\n",
                              tmplFilePath);
                exit(EXIT_FAILURE);
            }
            FREE_STR(code);
        } else {
            duk_pop(this->dukCtx);
            FREE_STR(code);
            return false;
        }
    }
    duk_pop(this->dukCtx);                                   // [...]
    textNodeArrayFreeProps(&this->siteGraph.tmplFiles);
    return true;
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

bool
websiteGenerate(Website *this, pageExportWriteFn writeFn, void *myPtr, char *err) {
    for (unsigned i = 0; i < this->siteGraph.pages.length; ++i) {
        Page *p = &this->siteGraph.pages.values[i];
        char *rendered = pageRender(this, p, p->url, err);
        if (rendered) {
            if (!writeFn(rendered, p, this, myPtr, err)) {
                FREE_STR(rendered);
                return false;
            }
            FREE_STR(rendered);
        } else {
            return false;
        }
    }
    return true;
}

bool
websiteInstall(Website *this, SampleData *data, const char *schemaSql,
               char *err) {
    printf("Starting to write sample data '%s' to '%s'...\n", data->name,
           this->rootDir);
    /**
     * 1. Create db schema
     */
    if (!dbRunInTransaction(this->db, schemaSql, err)) return false;
    /**
     * 2. Insert sample data
     */
    if (!dbRunInTransaction(this->db, data->installSql, err)) return false;
    /**
     * 3. Write the layout-files & template-files.
     */
    for (unsigned i = 0; i < data->numFiles; ++i) {
        STR_CONCAT(filePath, this->rootDir, data->files[i].name);
        if (!fileIOWriteFile(filePath, data->files[i].contents, err)) {
            return false;
        }
    }
    printf("All done.\n");
    return true;
}

static bool
fetchAndRenderBatches(Website *this, VTree *vTree, DocumentDataConfig *ddc,
                      const char *url, char *err) {
    ComponentArray components;
    bool success = false;
    if (!websiteFetchBatches(this, ddc, &components, err)) {
        goto done;
    }
    DataBatchConfig *cur = &ddc->batches;
    while (cur) {
        if (!cur->renderWith) {
            putError("Invalid DataBatchConfig.\n");
            goto done;
        }
        unsigned templateRootNodeId = vTreeScriptBindingsExecTemplateFromCache(
            this->dukCtx, vTree, cur, &components, cur->isFetchAll, url, err);
        if (templateRootNodeId < 1) {
            goto done;
        }
        if (!vTreeReplaceRef(vTree, TYPE_DATA_BATCH_CONFIG, cur->id,
                             vTreeUtilsMakeNodeRef(TYPE_ELEM, templateRootNodeId))) {
            goto done;
        }
        cur = cur->next;
    }
    success = true;
    done:
    componentArrayFreeProps(&components);
    return success;
}

char*
pageRender(Website *this, Page *page, const char *url, char *err) {
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    VTree vTree;
    DocumentDataConfig ddc;
    char *renderedHtml = NULL;
    if (!vTreeScriptBindingsExecLayoutFromCache(this->dukCtx,
        page->layoutFileName, &vTree, &ddc, url, err)) {
        goto done;
    }
    if (ddc.batchCount > 0 && !fetchAndRenderBatches(this, &vTree, &ddc, url,
                                                     err)) {
        goto done;
    }
    renderedHtml = vTreeToHtml(&vTree, err);
    done:
    duk_pop(this->dukCtx); // thread stash
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    return renderedHtml;
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

void
siteGraphInit(SiteGraph *this) {
    this->pages.capacity = 0;
    this->pages.length = 0;
    this->pages.values = NULL;
    this->tmplFiles.capacity = 0;
    this->tmplFiles.length = 0;
    this->tmplFiles.values = NULL;
}

void
siteGraphFreeProps(SiteGraph *this) {
    if (this->pages.values) pageArrayFreeProps(&this->pages);
    if (this->tmplFiles.values) textNodeArrayFreeProps(&this->tmplFiles);
}

bool
siteGraphParse(char *str, SiteGraph *out, StrReader *sr, char *err) {
    if (!strReaderIsDigit(str[0])) {
        putError("ParseError: Expected a digit but got '%c'.\n", str[0]);
        return false;
    }
    strReaderInit(sr, str, '|');
    unsigned totalPageCount = strReaderReadInt(sr);
    pageArrayInit(&out->pages, totalPageCount);
    unsigned templateCount = strReaderReadInt(sr);
    if (templateCount == 0) return false;
    textNodeArrayInit(&out->tmplFiles);
    while (*sr->current != '\0') {
        if (strReaderIsDigit(*sr->current)) {
            if (out->pages.length == totalPageCount) {
                printToStdErr("Critical: siteGraph->pages.values overflow. Exiting.\n");
                exit(EXIT_FAILURE);
            }
            Page newPage = {
                .id = strReaderReadInt(sr),
                .url = strReaderReadStr(sr),
                .parentId = strReaderReadInt(sr),
                .layoutFileName = strReaderReadStr(sr)
            };
            pageArrayPush(&out->pages, &newPage);
        } else if (out->pages.length > 0) {
            TextNode text;
            text.id = 0;
            text.chars = strReaderReadStr(sr);
            textNodeArrayPush(&out->tmplFiles, &text);
        } else {
            putError("Unpexted character '%c'.\n", *sr->current);
            return false;
        }
    }
    if (out->pages.length != totalPageCount) {
        printToStdErr("siteGraph->pages.length != definedTotalPageCount");
    }
    if (out->tmplFiles.length != templateCount) {
        printToStdErr("siteGraph->tmplFiles.length != definedTemplateCount");
    }
    return true;
}

void
siteGraphSerialize(SiteGraph *siteGraph, char *to) {

}

Page*
siteGraphFindPage(SiteGraph *siteGraph, const char *url) {
    for (unsigned i = 0; i < siteGraph->pages.length; ++i) {
        if (strcmp(siteGraph->pages.values[i].url, url) == 0) {
            return &siteGraph->pages.values[i];
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
    this->capacity = 0;
    this->length = 0;
    this->values = NULL;
}
