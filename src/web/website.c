#include "../../include/web/website.h"
#include <assert.h>

static void mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr);
static void mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr);
static bool doCacheTemplate(Website *this, const char *fileName, char *err);

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
websitePopulateTemplateCaches(Website *this, char *err) {
    TemplateArray *tmpls = &this->siteGraph.templates;
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    for (unsigned i = 0; i < tmpls->length; ++i) {
        if (!doCacheTemplate(this, tmpls->values[i].fileName, err)) {
            printToStdErr("%s. Rage quitting.\n", err);
            exit(EXIT_FAILURE);
        }
    }
    duk_pop(this->dukCtx);
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

bool
websiteCheckIsFWFileAcceptable(const char *fileName) {
    return strstr(fileName, ".js") != NULL;
}

void
websiteHandleFWEvent(FWEventType type, const char *fileName, void *myPtr) {
    Website *this = myPtr;
    char *err = this->errBuf;
    if (type == FW_ACTION_ADDED) {
        //
    } else if (type == FW_ACTION_MODIFIED) {
        int layoutIdx = -1;
        Template *layout = siteGraphFindTemplate(&this->siteGraph,
                                                 (char*)fileName, &layoutIdx);
        assert(layout != NULL && "An unknown file was modified.");
        duk_push_thread_stash(this->dukCtx, this->dukCtx);
        if (!doCacheTemplate(this, fileName, err)) {
            printToStdErr("%s", err);
            duk_pop(this->dukCtx);
            return;
        }
        //
        struct SiteGraphDiff diff;
        diff.newPages = NULL;
        char *rendered = pageRender(this, layoutIdx, "/", siteGraphDiffMake,
                                    &diff, err);
        if (rendered) {
            FREE_STR(rendered);
            bool hadChanges = false;
            if (diff.newPages) {
                hadChanges = true;
            }
            if (hadChanges) {
                // "update websites set siteGraph = siteGraphSerialize()" here...
            }
        } else {
            printToStdErr("Failed to rebuild the site-graph: %s", err);
        }
        duk_pop(this->dukCtx);
    } else if (type == FW_ACTION_DELETED) {
        //
    }
}

char*
pageRender(Website *this, int layoutIdx, const char *url,
           renderInspectFn inspectFn, void *myPtr, char *err) {
    #define NO_LAYOUT_PAGE "<html><body>Layout file '%s' doesn't exists yet.</body></html>"
    #define HAS_UNFIXED_ERRORS_PAGE "<html><body>Layout '%s' contains errors and can't be rendered.</body></html>"
    Template *layout = siteGraphGetTemplate(&this->siteGraph, layoutIdx);
    assert(layout != NULL && "Unknown layout.");
    // User has added a link, but hasn't had time to create a layout for it yet
    if (!layout->exists) {
        size_t messageLen = strlen(NO_LAYOUT_PAGE) -
                            2 + // %s
                            strlen(layout->fileName) +
                            1; // \0
        char *renderedHtml = ALLOCATE_ARR(char, messageLen);
        snprintf(renderedHtml, messageLen, NO_LAYOUT_PAGE, layout->fileName);
        return renderedHtml;
    }
    // Last modification had errors -> don't even bother rendering
    if (!inspectFn && layout->hasErrors) {
        size_t messageLen = strlen(HAS_UNFIXED_ERRORS_PAGE) - 2 +
                            strlen(layout->fileName) + 1;
        char *renderedHtml = ALLOCATE_ARR(char, messageLen);
        snprintf(renderedHtml, messageLen, HAS_UNFIXED_ERRORS_PAGE, layout->fileName);
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
        if (inspectFn) layout->hasErrors = true;
        goto done;
    } else if (layout->hasErrors) {
        layout->hasErrors = false;
    }
    if (ddc.batchCount > 0 && !websiteFetchBatches(this, &ddc, &components, err)) {
        goto done;
    }
    if (!vTreeScriptBindingsExecLayoutTmpl(this->dukCtx, &vTree,
        ddc.batchCount > 0 ? &ddc.batches : NULL, &components, err)) {
        goto done;
    }
    renderedHtml = vTreeToHtml(&vTree, err);
    if (inspectFn) inspectFn(&this->siteGraph, &vTree, myPtr, err);
    done:
    duk_pop(this->dukCtx); // thread stash
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    componentArrayFreeProps(&components);
    return renderedHtml;
}

static void
mapSiteGraphResultRow(sqlite3_stmt *stmt, void **myPtr) {
    *myPtr = copyString((const char*)sqlite3_column_text(stmt, 0));
}

static void
mapDataBatchesRow(sqlite3_stmt *stmt, void **myPtr) {
    ComponentArray *arr = *myPtr;
    Component newComponent;
    componentInit(&newComponent);
    newComponent.id = (unsigned)sqlite3_column_int(stmt, 0);
    newComponent.name = copyString((const char*)sqlite3_column_text(stmt, 1));
    newComponent.json = copyString((const char*)sqlite3_column_text(stmt, 2));
    newComponent.dataBatchConfigId = (unsigned)sqlite3_column_int(stmt, 3);
    componentArrayPush(arr, &newComponent);
}

static bool
doCacheTemplate(Website *this, const char *fileName, char *err) {
    /*
     * Read contents from disk
     */
    STR_CONCAT(tmplFilePath, this->rootDir, fileName);
    char *code = fileIOReadFile(tmplFilePath, err);
    if (!code) return false;
    bool success = false;
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
            duk_put_prop_string(this->dukCtx, -2, fileName); // [... stash]
            success = true;
        } else {
            putError("Failed to cache %s.\n", tmplFilePath);
            duk_pop(this->dukCtx); // [... stash]
        }
    }
    FREE_STR(code);
    return success;
}
