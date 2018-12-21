#include "../include/website-diff-manager.h"

static void processSiteGraph(SiteGraph *siteGraph, VTree *vTree, void *dukCtx,
                              void *toMyPtr, char *err);
static bool saveStaticFileUrlsToDb(StrTube *urls, Db *db, char *err);
static bool bindWebsiteQueryVals(sqlite3_stmt *stmt, void *data);

void
websiteDiffInit(WebsiteDiff *this) {
    this->newPages = NULL;
    this->newPagesTail = NULL;
    strTubeInit(&this->staticFiles);
}

void
websiteDiffFreeProps(WebsiteDiff *this) {
    this->newPagesTail = NULL;
    PageRef *cur = this->newPages;
    PageRef *tmp;
    while (cur) {
        tmp = cur;
        cur = cur->next;
        FREE(PageRef, tmp);
    }
    strTubeFreeProps(&this->staticFiles);
}

bool
websiteDiffPerformRescan(Website *this, const char *url, int layoutIdx,
                         char *err) {
    //
    bool success = false;
    WebsiteDiff diff;
    websiteDiffInit(&diff);
    if (!pageDryRun(this, siteGraphGetTemplate(&this->siteGraph, layoutIdx),
                    url, processSiteGraph, &diff, err)) goto done;
    success = diff.staticFiles.length ? saveStaticFileUrlsToDb(
        &diff.staticFiles, this->db, err) : true;
    if (success && diff.newPages && !websiteSaveToDb(this, err)) {
        putError("Failed to save the site-graph: %s\n", err);
        success = false;
    }
    done:
    if (success) printf("[Info]: Rescanned '%s': %s, %s file resources.\n", url,
                        diff.newPages ? "added page(s)" : "no page changes",
                        diff.staticFiles.length ? "detected" : "no");
    else printToStdErr("[Error]: %s", err);
    websiteDiffFreeProps(&diff);
    return success;
}

static void
processSiteGraph(SiteGraph *siteGraph, VTree *vTree, void *dukCtx,
                   void *toMyPtr, char *err) {
    for (unsigned i = 0; i < vTree->elemNodes.length; ++i) {
        ElemNode *el = &vTree->elemNodes.values[i];
        ElemProp *scriptSrc = NULL;
        ElemProp *styleSrc = NULL;
        /*
         * Handle <a href=<path>...
         */
        if (strcmp(el->tagName, "a") == 0) {
            ElemProp *lfn = elemNodeGetProp(&vTree->elemNodes.values[i],
                                            "layoutFileName");
            // layoutFileName-attribute not defined -> skip
            if (!lfn) continue;
            ElemProp *href = elemNodeGetProp(&vTree->elemNodes.values[i], "href");
            if (!href) {
                printToStdErr("[Error]: Can't follow a link without href.\n");
                return;
            }
            // Page already in the site-graph -> skip
            if (siteGraphFindPage(siteGraph, href->val)) continue;
            char *hrefUrl = copyString(href->val);
            // New page -> add it
            int layoutIdx = -1;
            (void)siteGraphFindTemplate(siteGraph, lfn->val, &layoutIdx);
            if (layoutIdx == -1) {
                Template *l = siteGraphAddTemplate(siteGraph, copyString(lfn->val));
                l->sampleUrl = hrefUrl;
                l->exists = false;
                layoutIdx = siteGraph->templates.length - 1;
            }
            PageRef *n = ALLOCATE(PageRef);
            n->next = NULL;
            n->ptr = siteGraphAddPage(siteGraph, 99, hrefUrl, 0, layoutIdx);
            WebsiteDiff *diff = toMyPtr;
            if (diff->newPages) {
                diff->newPagesTail->next = n;
                diff->newPagesTail = n;
            } else {
                diff->newPages = n;
                diff->newPagesTail = diff->newPages;
            }
        /*
         * Handle <script src=<path>...
         */
        } else if (strcmp(el->tagName, "script") == 0 &&
                   (scriptSrc = elemNodeGetProp(el, "src"))) {
            strTubePush(&((WebsiteDiff*)toMyPtr)->staticFiles, scriptSrc->val);
        /*
         * Handle <link href=<path>...
         */
        } else if (strcmp(el->tagName, "link") == 0 &&
                   (styleSrc = elemNodeGetProp(el, "href"))) {
            strTubePush(&((WebsiteDiff*)toMyPtr)->staticFiles, styleSrc->val);
        }
    }
}

static bool
saveStaticFileUrlsToDb(StrTube *urls, Db *db, char *err) {
    //
    const char *baseSql = "insert or replace into staticFileResources values ";
    const unsigned lenA = strlen(baseSql);
    char *sql = ALLOCATE_ARR(char, lenA + (strlen("(?),") * urls->length));
    char *tail = sql;
    STR_APPEND(tail, baseSql, lenA);
    //
    for (unsigned i = 0; i < urls->length; ++i) STR_APPEND(tail, "(?),", 4);
    tail[-1] = '\0'; // '(?),(?),' -> '(?),(?)\0'
    //
    StrTubeReader r = strTubeReaderMake(urls);
    int res = dbInsert(db, sql, bindWebsiteQueryVals, &r, err);
    if (res < 0) {
        printToStdErr("[Error]: Failed to save static resource urls: %s", err);
        return false;
    }
    FREE_STR(sql);
    return true;
}

static bool
bindWebsiteQueryVals(sqlite3_stmt *stmt, void *data) {
    StrTubeReader *r = data;
    char *url = NULL;
    while ((url = strTubeReaderNext(r))) {
        if (sqlite3_bind_text(stmt, r->i, url, -1, SQLITE_STATIC) != SQLITE_OK)
            return false;
    }
    return true;
}
