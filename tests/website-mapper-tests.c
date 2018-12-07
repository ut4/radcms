#include "website-mapper-tests.h"

static void
testWebsiteFetchAndParseSiteGraphDoesWhatItSays(Db *db, char *err) {
    // 1. Setup
    Website website;
    websiteInit(&website);
    website.db = db;
    if (!testUtilsExecSql(db,
        "insert into websites values (1,'2|1|1/a|0|0|2/b|0|0|a.tmpl')"
    )) return;
    // 2. Call
    if (!websiteFetchAndParseSiteGraph(&website, err)) {
        assertThatOrGoto(false, done, "Should fetch and parse the sitegraph");
    }
    // 3. Assert
    assertIntEqualsOrGoto(website.siteGraph.pages.size, 2, done);
    assertIntEquals(website.siteGraph.templates.length, 1);
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

static bool mapTestDataRow(sqlite3_stmt *stmt, void *myPtr) {
    *((char**)myPtr) = copyString((const char*)sqlite3_column_text(stmt, 0));
    return true;
}

static void
testWebsiteInstallWritesAllData(Db *db, char *err) {
    char *dir = testUtilsGetNormalizedCwd();
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
                 "and name='foo'", mapTestDataRow, &tableName, err)) {
        assertThatOrGoto(tableName != NULL, done, "Should run $mockSchemaSql");
        FREE_STR(tableName);
    }
    // Assert that ran data->installSql
    char *installRow = NULL;
    if (dbSelect(db, "select bar from foo", mapTestDataRow, &installRow, err)) {
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
    if (!fileIODeleteFile(testTmplFilePath, err)) printToStdErr("%s", err);
    websiteFreeProps(&site);
    FREE_STR(dir);
}

static void
testWebsiteSaveToDbUpdatesTheDatabase(Db *db, char *err) {
    if (!testUtilsExecSql(db,
        "insert into websites values (1,'...')"
    )) return;
    //
    Website site;
    websiteInit(&site);
    site.db = db;
    siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    siteGraphAddTemplate(&site.siteGraph, copyString("mytmpl.js"));
    //
    assertThatOrGoto(websiteSaveToDb(&site, err), done, "Should return succesfully");
    char *actual = NULL;
    if (dbSelect(db, "select `graph` from websites", mapTestDataRow, &actual, err)) {
        assertThatOrGoto(actual != NULL, done, "Sanity updatedGraph != NULL");
    }
    assertStrEquals(actual, "1|1|1/|0|0|mytmpl.js|");
    FREE_STR(actual);
    done:
        websiteFreeProps(&site);
        testUtilsExecSql(db,
            "delete from websites;"
        );
}

void
websiteMapperTestsRun() {
    /*
     * Before
     */
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        dbDestruct(&db);
        return;
    }
    /*
     * The tests
     */
    testWebsiteFetchAndParseSiteGraphDoesWhatItSays(&db, errBuf);
    testWebsiteFetchBatchesFetchesDataForDDCWithOneBatch(&db, errBuf);
    testWebsiteFetchBatchesFetchesDataForDDCWithMultipleBatches(&db, errBuf);
    testWebsiteInstallWritesAllData(&db, errBuf);
    testWebsiteSaveToDbUpdatesTheDatabase(&db, errBuf);
    /*
     * After
     */
    dbDestruct(&db);
}

