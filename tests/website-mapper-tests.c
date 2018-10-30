#include "website-mapper-tests.h"

static Page *wmtUtilsPutPage(PageArray *to, unsigned id, const char *url,
                            const char *layoutFileName, unsigned parentId);
static bool wmtUtilsPutToCache(duk_context *ctx, char *code, char *key, char *err);

static void
testWebsiteFetchAndParseSiteGraphDoesWhatItSays(Db *db, char *err) {
    // 1. Setup
    Website website;
    websiteInit(&website);
    website.db = db;
    if (!testUtilsExecSql(db,
        "insert into websites values (1,'2|1|1/a|0|a.tmpl|2/b|0|a.tmpl|a.tmpl')"
    )) return;
    // 2. Call
    if (!websiteFetchAndParseSiteGraph(&website, err)) {
        assertThatOrGoto(false, done, "Should fetch and parse the sitegraph");
    }
    // 3. Assert
    assertIntEqualsOrGoto(website.siteGraph.pages.length, 2, done);
    assertIntEquals(website.siteGraph.tmplFiles.length, 1);
    done:
        websiteFreeProps(&website);
        testUtilsExecSql(db, "delete from websites");
}

static void
testWebsiteFetchBatchesFetchesDataForDDCWithOneBatch(Db *db, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1,'test');"
        "insert into components values (1,'aname','{\"prop\":1}',1)"
    )) return;
    Website website;
    websiteInit(&website);
    website.db = db;
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    DataBatchConfig *dbc = documentDataConfigAddBatch(&ddc, "test", false);
    dataBatchConfigSetWhere(dbc, "name=\"aname\"");
    //
    ComponentArray cmps;
    bool success = websiteFetchBatches(&website, &ddc, &cmps, err);
    assertThatOrGoto(success, done, "Should return succesfully");
    assertIntEqualsOrGoto(cmps.length, 1, done);
    Component *cmp = &cmps.values[0];
    assertIntEquals(cmp->id, 1);
    assertStrEquals(cmp->name, "aname");
    assertStrEquals(cmp->json, "{\"prop\":1}");
    assertIntEquals(cmp->dataBatchConfigId, 1);
    //
    done:
        websiteFreeProps(&website);
        documentDataConfigFreeProps(&ddc);
        componentArrayFreeProps(&cmps);
        testUtilsExecSql(db,
            "delete from components;"
            "delete from componentTypes"
        );
}

static void
testWebsiteFetchBatchesFetchesDataForDDCWithMultipleBatches(Db *db, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1,'Article');"
        "insert into components values (1,'aname','{\"prop\":1}',1),(2,'another','0',1)"
    )) return;
    Website website;
    websiteInit(&website);
    website.db = db;
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    documentDataConfigAddBatch(&ddc, "Article", true);
    //
    ComponentArray cmps;
    bool success = websiteFetchBatches(&website, &ddc, &cmps, err);
    assertThatOrGoto(success, done, "Should return succesfully");
    assertIntEqualsOrGoto(cmps.length, 2, done);
    Component *art1 = &cmps.values[0];
    assertIntEquals(art1->id, 1);
    assertStrEquals(art1->name, "aname");
    assertStrEquals(art1->json, "{\"prop\":1}");
    assertIntEquals(art1->dataBatchConfigId, 1);
    Component *art2 = &cmps.values[1];
    assertIntEquals(art2->id, 2);
    assertStrEquals(art2->name, "another");
    assertStrEquals(art2->json, "0");
    assertIntEquals(art2->dataBatchConfigId, 1);
    //
    done:
        websiteFreeProps(&website);
        documentDataConfigFreeProps(&ddc);
        componentArrayFreeProps(&cmps);
        testUtilsExecSql(db,
            "delete from components;"
            "delete from componentTypes"
        );
}

static bool logPageWriteCall(char *renderedHtml, Page *page, Website *site,
                             void *myPtr, char *err) {
    TextNodeArray *log = (TextNodeArray*)myPtr;
    TextNode stored;
    stored.id = 0;
    stored.chars = copyString(renderedHtml);
    textNodeArrayPush(log, &stored);
    return true;
}

static void
testWebsiteGenerateProcessesPagesWithNoDbcs(Db *db, char *err) {
    duk_context *ctx = myDukCreate(err);
    if (!ctx) { printToStdErr("Failed to create duk_context\n"); exit(EXIT_FAILURE); }
    vTreeScriptBindingsRegister(ctx);
    dataQueryScriptBindingsRegister(ctx);
    //
    Website site;
    websiteInit(&site);
    pageArrayInit(&site.siteGraph.pages, 2);
    site.db = db;
    site.dukCtx = ctx;
    TextNodeArray log;
    textNodeArrayInit(&log);
    Page *p1 = wmtUtilsPutPage(&site.siteGraph.pages, 1, "/", "a.js", 0);
    Page *p2 = wmtUtilsPutPage(&site.siteGraph.pages, 2, "/foo", "b.js", 0);
    if (!wmtUtilsPutToCache(ctx, "function(){return function(v){v.registerElement('p',null,'a'); };}",
                            p1->layoutFileName, err)) { printToStdErr(err); goto done; }
    if (!wmtUtilsPutToCache(ctx, "function(){return function(v){v.registerElement('p',null,'b'); };}",
                            p2->layoutFileName, err)) { printToStdErr(err); goto done; }
                            printf("generating\n");
    //
    websiteGenerate(&site, logPageWriteCall, (void*)&log, err);
    //
    assertThatOrGoto(log.length == 2, done, "Should pass each page to writeFn");
    assertThatOrGoto(log.values[0].chars != NULL, done, "renderedHtml #0 != NULL");
    assertStrEquals(log.values[0].chars, "<p>a</p>");
    assertThatOrGoto(log.values[1].chars != NULL, done, "renderedHtml #1 != NULL");
    assertStrEquals(log.values[1].chars, "<p>b</p>");
    done:
        duk_destroy_heap(ctx);
        websiteFreeProps(&site);
        textNodeArrayFreeProps(&log);
}

static void mapTestDataRow(sqlite3_stmt *stmt, void **myPtr) {
    *myPtr = copyString((const char*)sqlite3_column_text(stmt, 0));
}

static void
testWebsiteInstallWritesAllData(Db *db, char *err) {
    char cwd[PATH_MAX];
    if (!getcwd(cwd, sizeof(cwd))) {
        perror("getcwd() error");
        return;
    }
    char *dir = fileIOGetNormalizedPath(cwd);
    //
    Website site;
    websiteInit(&site);
    site.db = db;
    site.rootDir = dir;
    const char* mockSchemaSql = "create table foo ( bar text );";
    SampleData data = {
        .name="test",
        .numFiles=1,
        .files=(SampleDataFile[1]){{.name="text.txt", .contents="foo"}},
        .installSql="insert into foo values ('atest');",
        .siteIniContents=""
    };
    STR_CONCAT(testTmplFilePath, site.rootDir, data.files[0].name);
    bool success = websiteInstall(&site, &data, mockSchemaSql, err);
    assertThatOrGoto(success, done, "Should return succesfully");
    // Assert that ran mockSchemaSql
    char *tableName = NULL;
    if (dbSelect(db, "select name FROM sqlite_master WHERE type='table' "
                 "and name='foo'", mapTestDataRow, (void*)&tableName, err)) {
        assertThatOrGoto(tableName != NULL, done, "Should run $mockSchemaSql");
        FREE_STR(tableName);
    }
    // Assert that ran data->installSql
    char *installRow = NULL;
    if (dbSelect(db, "select bar from foo", mapTestDataRow, (void*)&installRow, err)) {
        assertThatOrGoto(installRow != NULL, done, "Should run $data->installSql");
        assertStrEquals(installRow, "atest");
        FREE_STR(installRow);
    }
    // Assert that wrote a template-file
    char *actualTmplFileContents = fileIOReadFile(testTmplFilePath, err);
    assertThatOrGoto(actualTmplFileContents != NULL, done, "Should write tmpl file");
    assertStrEquals(actualTmplFileContents, data.files[0].contents);
    FREE_STR(actualTmplFileContents);
    done:
    if (!fileIODeleteFile(testTmplFilePath, err)) printToStdErr(err);
    websiteFreeProps(&site);
    FREE_STR(dir);
}

void
websiteMapperTestsRun() {
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        dbDestruct(&db);
        return;
    }
    testWebsiteFetchAndParseSiteGraphDoesWhatItSays(&db, errBuf);
    testWebsiteFetchBatchesFetchesDataForDDCWithOneBatch(&db, errBuf);
    testWebsiteFetchBatchesFetchesDataForDDCWithMultipleBatches(&db, errBuf);
    testWebsiteGenerateProcessesPagesWithNoDbcs(&db, errBuf);
    testWebsiteInstallWritesAllData(&db, errBuf);
    dbDestruct(&db);
}

static Page *wmtUtilsPutPage(PageArray *to, unsigned id, const char *url,
                             const char *layoutFileName, unsigned parentId) {
    Page p;
    p.id = id;
    p.url = copyString(url);
    p.layoutFileName = copyString(layoutFileName);
    p.parentId = parentId;
    pageArrayPush(to, &p);
    return &to->values[to->length - 1];
}

static bool wmtUtilsPutToCache(duk_context *ctx, char *code, char *key, char *err) {
    duk_push_thread_stash(ctx, ctx);
    if (!dukUtilsCompileStrToFn(ctx, code, err)) return false;
    duk_dump_function(ctx);
    duk_size_t bytecodeSize = 0;
    (void)duk_get_buffer(ctx, -1, &bytecodeSize);
    if (bytecodeSize == 0) { putError("Failed to dump fn\n"); return false; }
    duk_put_prop_string(ctx, -2, key);
    duk_pop(ctx); // thread stash
    return true;
}
