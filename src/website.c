#include "../include/website.h"

static bool mapDataBatchesRow(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow);
static bool mapSiteGraphResultRow(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow);
static bool bindWebsiteQueryVals(sqlite3_stmt *stmt, void *data);

void
websiteInit(Website *this) {
    siteGraphInit(&this->siteGraph);
    this->sitePath = NULL;
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
                 mapSiteGraphResultRow, &serializedGraphFromDb, err)) {
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
    duk_push_global_stash(this->dukCtx);
    //
    for (unsigned i = 0; i < tmpls->length; ++i) {
        if (!websiteCompileAndCacheTemplate(this, tmpls->values[i].fileName, -1,
                                            err)) {
            goto failBadly;
        }
    }
    //
    const char *n = "article-list-directive.js";
    if (!dukUtilsCompileStrToFn(this->dukCtx, getSampleFile(n), n, err)) {
        goto failBadly;
    }
    commonScriptBindingsPutDirective(this->dukCtx, "ArticleList", -2);
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
           dbSelect(this->db, sql, mapDataBatchesRow, to, err);
}

unsigned
websiteGenerate(Website *this, pageExportWriteFn writeFn, void *writeFnMyptr,
                StrTube *issues, char *err) {
    HashMapElPtr *ptr = this->siteGraph.pages.orderedAccess;
    unsigned numSuccesfulWrites = 0;
    while (ptr) {
        Page *p = ptr->data;
        char *rendered = pageRender(this, p->layoutIdx, p->url, NULL, NULL,
                                    issues, err);
        if (rendered) {
            if (!writeFn(rendered, p, this, writeFnMyptr, err)) {
                FREE_STR(rendered);
                return false;
            }
            FREE_STR(rendered);
            numSuccesfulWrites += 1;
        } else {
            return numSuccesfulWrites;
        }
        ptr = ptr->next;
    }
    return numSuccesfulWrites;
}

bool
websiteInstall(Website *this, SampleData *data, const char *schemaSql,
               char *err) {
    printf("[Info]: Starting to write sample data '%s' to '%s'...\n", data->name,
           this->sitePath);
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
        STR_CONCAT(filePath, this->sitePath, data->files[i].name);
        if (!fileIOWriteFile(filePath, data->files[i].contents, err)) {
            return false;
        }
    }
    printf("[Info]: Wrote sample data.\n");
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
websiteCompileAndCacheTemplate(Website *this, const char *fileName,
                               int dukStashItAt, char *err) {
    STR_CONCAT(tmplFilePath, this->sitePath, fileName);
    char *isx = fileIOReadFile(tmplFilePath, err);
    if (!isx) return false;
    char *js = transpilerTranspileIsx(isx);
    //
    if (!js) {
        putError("Failed to compile isx: %s", transpilerGetLastError());
        FREE_STR(isx);
        return false;
    }
    //
    bool success = false;
    if (dukUtilsCompileStrToFn(this->dukCtx, js, fileName, err)) { // [? fn]
        duk_put_prop_string(this->dukCtx, dukStashItAt - (dukStashItAt < 0 ? 1 : 0),
                            fileName);                             // [?]
        success = true;
    }
    FREE_STR(isx);
    return success;
}

char*
pageRender(Website *this, int layoutIdx, const char *url,
           renderInspectFn inspectFn, void *inspectFnMyPtr, StrTube *issues,
           char *err) {
    #define NO_LAYOUT_TMPL "Layout file '%s' doesn't exists yet."
    #define NO_LAYOUT_PAGE "<html><body>"NO_LAYOUT_TMPL"</body></html>"
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
        if (issues) {
            char issue[strlen(url) +
                       1 + // '>'
                       strlen(NO_LAYOUT_TMPL) - 2 + strlen(layout->fileName) + // message
                       1]; // '\0'
            sprintf(issue, "%s>"NO_LAYOUT_TMPL, url, layout->fileName);
            strTubePush(issues, issue);
        }
        return renderedHtml;
    }
    duk_push_global_stash(this->dukCtx);
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
    if (inspectFn) inspectFn(&this->siteGraph, &vTree, this->dukCtx,
                             inspectFnMyPtr, err);
    done:
    duk_pop(this->dukCtx); // stash
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    componentArrayFreeProps(&components);
    return renderedHtml;
    #undef NO_LAYOUT_TMPL
    #undef NO_LAYOUT_PAGE
}

bool
pageDryRun(Website *this, Template *layout, const char *url,
           renderInspectFn inspectFn, void *inspectFnMyPtr, char *err) {
    duk_push_global_stash(this->dukCtx);
    VTree vTree;
    vTreeInit(&vTree);
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    ComponentArray components;
    componentArrayInit(&components);
    bool success = false;
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
    success = true;
    inspectFn(&this->siteGraph, &vTree, this->dukCtx, inspectFnMyPtr, err);
    done:
    duk_pop(this->dukCtx); // stash
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    componentArrayFreeProps(&components);
    return success;
}

static bool
mapDataBatchesRow(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow) {
    ComponentArray *arr = myPtr;
    componentArrayPush(arr, (Component){
        .id = (unsigned)sqlite3_column_int(stmt, 0),
        .name = copyString((const char*)sqlite3_column_text(stmt, 1)),
        .json = copyString((const char*)sqlite3_column_text(stmt, 2)),
        .componentTypeId = 0,
        .dataBatchConfigId = (unsigned)sqlite3_column_int(stmt, 3)
    });
    return true;
}

static bool
mapSiteGraphResultRow(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow) {
    *((char**)myPtr) = copyString((const char*)sqlite3_column_text(stmt, 0));
    return true;
}

static bool
bindWebsiteQueryVals(sqlite3_stmt *stmt, void *data) {
    return sqlite3_bind_text(stmt, 1, data, -1, SQLITE_STATIC) == SQLITE_OK;
}
