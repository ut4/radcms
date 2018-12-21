#include "website-diff-tests.h"

static void
testPerformRescanSpotsNewLinks(Db *db, duk_context *ctx, char *errBuf) {
    #define newLinkUrl1 "/foo"
    #define newLinkUrl2 "/bar"
    Website site;
    websiteInit(&site);
    site.db = db;
    site.dukCtx = ctx;
    Template *l = siteGraphAddTemplate(&site.siteGraph, copyString("foo.js"));
    Page *p = siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    if (!testUtilsExecSql(db, "insert into websites values (1,'1|0|1/|0|0|')")) return;
    unsigned pageCountBefore = site.siteGraph.pages.size;
    const char *updatedLayoutTmpl = "function (ddc, url) {"
        "return function(vTree) {"
            "vTree.registerElement('div', null, ["
                "vTree.registerElement('a', {layoutFileName:'foo.js',href:'"newLinkUrl1"'}, 'Hello'),"
                "vTree.registerElement('a', {layoutFileName:'foo.js',href:'"newLinkUrl2"'}, 'olleH')"
            "]);"
        "}"
    "}";
    if (!testUtilsCompileAndCache(ctx, updatedLayoutTmpl, l->fileName, errBuf)) {
        printToStdErr("%s", errBuf); goto done;
    }
    //
    bool success = websiteDiffPerformRescan(&site, p->url, p->layoutIdx, errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    //
    assertIntEqualsOrGoto(site.siteGraph.pages.size, pageCountBefore + 2, done);
    Page *actual1 = siteGraphFindPage(&site.siteGraph, newLinkUrl1);
    assertThatOrGoto(actual1 != NULL, done, "Should add new page #1 to siteGraph");
    assertStrEquals(actual1->url, newLinkUrl1);
    Page *actual2 = siteGraphFindPage(&site.siteGraph, newLinkUrl2);
    assertThatOrGoto(actual2 != NULL, done, "Should add new page #2 to siteGraph");
    assertStrEquals(actual2->url, newLinkUrl2);
    done:
        websiteFreeProps(&site);
        testUtilsExecSql(db, "delete from websites");
    #undef newLinkUrl1
    #undef newLinkUrl2
}

static bool mapStaticFileResRow(sqlite3_stmt *stmt, void *myPtr, unsigned nthRow) {
    strTubePush(myPtr, (const char*)sqlite3_column_text(stmt, 0));
    return true;
}

static void
testPerformRescanSpotsNewCssAndScriptResources(Db *db, duk_context *ctx,
                                                 char *errBuf) {
    #define newCssUrl "file.css"
    #define newScriptUrl "file.js"
    Website site;
    websiteInit(&site);
    site.db = db;
    site.dukCtx = ctx;
    Template *l = siteGraphAddTemplate(&site.siteGraph, copyString("foo.js"));
    Page *p = siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    const char *updatedLayoutTmpl = "function (ddc, url) {"
        "return function(vTree) {"
            "vTree.registerElement('head', null, ["
                "vTree.registerElement('link', {rel:'stylesheet',href:'"newCssUrl"'}, ''),"
                "vTree.registerElement('script', {src:'"newScriptUrl"'}, '')"
            "]);"
        "}"
    "}";
    if (!testUtilsCompileAndCache(ctx, updatedLayoutTmpl, l->fileName, errBuf)) {
        printToStdErr("%s", errBuf); goto done;
    }
    //
    bool success = websiteDiffPerformRescan(&site, p->url, p->layoutIdx, errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    //
    StrTube actuallyStored = strTubeMake();
    bool selectRes = dbSelect(db, "select `url` FROM staticFileResources",
                              mapStaticFileResRow, &actuallyStored, errBuf);
    assertThatOrGoto(selectRes, done, "Should save urls to db");
    assertIntEqualsOrGoto(actuallyStored.length, 2, done);
    StrTubeReader r = strTubeReaderMake(&actuallyStored);
    assertStrEquals(strTubeReaderNext(&r), newCssUrl);
    assertStrEquals(strTubeReaderNext(&r), newScriptUrl);
    done:
        websiteFreeProps(&site);
        strTubeFreeProps(&actuallyStored);
    #undef newCssUrl
    #undef newScriptUrl
}

void
websiteDiffTestsRun() {
    /*
     * Before all
     */
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        dbDestruct(&db);
        return;
    }
    duk_context *ctx = myDukCreate(errBuf);
    ASSERT(ctx != NULL, "Failed to create duk_context");
    vTreeScriptBindingsInit(ctx);
    dataQueryScriptBindingsInit(ctx);
    /*
     * The tests
     */
    testPerformRescanSpotsNewLinks(&db, ctx, errBuf);
    testPerformRescanSpotsNewCssAndScriptResources(&db, ctx, errBuf);
    /*
     * After all
     */
    dbDestruct(&db);
    duk_destroy_heap(ctx);
}

