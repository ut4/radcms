#include "../include/website.h"

static bool mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr);
static bool mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr);
static bool bindWebsiteQueryVals(sqlite3_stmt *stmt, void *data);

void
websiteInit(Website *this) {
    siteGraphInit(&this->siteGraph);
    this->rootDir = NULL;
    this->dukCtx = NULL;
    this->db = NULL;
    this->errBuf = NULL;
}

void
websiteFreeProps(Website *this) {
    siteGraphFreeProps(&this->siteGraph);
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
websitePopulateDukCaches(Website *this, char *err) {
    TemplateArray *tmpls = &this->siteGraph.templates;
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    //
    for (unsigned i = 0; i < tmpls->length; ++i) {
        if (!websiteCacheTemplate(this, tmpls->values[i].fileName, err)) {
            goto failBadly;
        }
    }
    //
    const char *n = "article-list-directive.js";
    if (dukUtilsCompileStrToFn(this->dukCtx, getSampleFile(n), n, err)) {
        duk_put_prop_string(this->dukCtx, -2, n);
    } else {
        goto failBadly;
    }
    directiveFactoriesPutCachedFn(this->dukCtx, "ArticleList", n);
    //
    duk_pop(this->dukCtx);
    return true;
    failBadly:
        printToStdErr("%s. Rage quitting.\n", err);
        exit(EXIT_FAILURE);
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
    HashMapElPtr *ptr = this->siteGraph.pages.orderedAccess;
    while (ptr) {
        Page *p = ptr->data;
        char *rendered = pageRender(this, p->layoutIdx, p->url, NULL, NULL, err);
        if (rendered) {
            if (!writeFn(rendered, p, this, myPtr, err)) {
                FREE_STR(rendered);
                return false;
            }
            FREE_STR(rendered);
        } else {
            return false;
        }
        ptr = ptr->next;
    }
    return true;
}

bool
websiteInstall(Website *this, SampleData *data, const char *schemaSql,
               char *err) {
    printf("Info: Starting to write sample data '%s' to '%s'...\n", data->name,
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
    printf("Info: All done.\n");
    return true;
}

bool
websiteSaveToDb(Website *this, char *err) {
    char *serializedGraph = siteGraphSerialize(&this->siteGraph);
    if (!serializedGraph) return false;
    int res = dbUpdate(this->db, "update websites set `graph` = ?",
                       bindWebsiteQueryVals, serializedGraph, err);
    FREE_STR(serializedGraph);
    return res > 0;
}

bool
websiteCacheTemplate(Website *this, const char *fileName, char *err) {
    STR_CONCAT(tmplFilePath, this->rootDir, fileName);
    char *code = fileIOReadFile(tmplFilePath, err);
    if (!code) return false;
    bool success = false;
    //
    if (dukUtilsCompileStrToFn(this->dukCtx, code, fileName, err)) { // [stash fn]
        duk_put_prop_string(this->dukCtx, -2, fileName);             // [stash]
        success = true;
    }
    FREE_STR(code);
    return success;
}

char*
pageRender(Website *this, int layoutIdx, const char *url,
           renderInspectFn inspectFn, void *myPtr, char *err) {
    #define NO_LAYOUT_PAGE "<html><body>Layout file '%s' doesn't exists yet.</body></html>"
    Template *layout = siteGraphGetTemplate(&this->siteGraph, layoutIdx);
    ASSERT(layout != NULL, "Unknown layoutIdx %u.\n", layoutIdx);
    // User has added a link, but hasn't had the time to create a layout for it yet
    if (!layout->exists) {
        size_t messageLen = strlen(NO_LAYOUT_PAGE) -
                            2 + // %s
                            strlen(layout->fileName) +
                            1; // \0
        char *renderedHtml = ALLOCATE_ARR(char, messageLen);
        snprintf(renderedHtml, messageLen, NO_LAYOUT_PAGE, layout->fileName);
        return renderedHtml;
    }
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    VTree vTree;
    vTreeInit(&vTree);
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    ComponentArray components;
    componentArrayInit(&components);
    char *renderedHtml = NULL;
    if (!vTreeScriptBindingsExecLayoutWrapFromCache(this->dukCtx, layout->fileName,
                                                    &ddc, url, err)) {
        goto done;
    }
    if (ddc.batchCount > 0 && !websiteFetchBatches(this, &ddc, &components, err)) {
        goto done;
    }
    if (!vTreeScriptBindingsExecLayoutTmpl(this->dukCtx, &vTree,
        ddc.batchHead ? &ddc.batches : NULL, &components, layout->fileName, err)) {
        goto done;
    }
    renderedHtml = vTreeToHtml(&vTree, err);
    if (inspectFn) inspectFn(&this->siteGraph, &vTree, this->dukCtx, myPtr, err);
    done:
    duk_pop(this->dukCtx); // thread stash
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    componentArrayFreeProps(&components);
    return renderedHtml;
    #undef NO_LAYOUT_PAGE
}

static bool
mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr) {
    *myPtr = copyString((const char*)sqlite3_column_text(stmt, 0));
    return true;
}

static bool
mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr) {
    ComponentArray *arr = *myPtr;
    Component newComponent;
    componentInit(&newComponent);
    newComponent.id = (unsigned)sqlite3_column_int(stmt, 0);
    newComponent.name = copyString((const char*)sqlite3_column_text(stmt, 1));
    newComponent.json = copyString((const char*)sqlite3_column_text(stmt, 2));
    newComponent.dataBatchConfigId = (unsigned)sqlite3_column_int(stmt, 3);
    componentArrayPush(arr, &newComponent);
    return true;
}

static bool
bindWebsiteQueryVals(sqlite3_stmt *stmt, void *data) {
    return sqlite3_bind_text(stmt, 1, data, -1, SQLITE_STATIC) == SQLITE_OK;
}
