#include "website-mapper-tests.h"

static void
testWebsiteFetchAndParseSiteGraphDoesWhatItSays(Db *db, char *err) {
    // 1. Setup
    Website website;
    websiteInit(&website);
    website.db = db;
    // 2. Call
    if (!websiteFetchAndParseSiteGraph(&website, err)) {
        assertThatOrGoto(false, done, "Should fetch and parse the sitegraph");
    }
    // 3. Assert
    assertIntEqualsOrGoto(website.siteGraph.length, 2, done);
    assertIntEquals(website.siteGraph.values[0].id, 1);
    assertIntEquals(website.siteGraph.values[1].id, 2);
    done:
        websiteFreeProps(&website);
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
    dbDestruct(&db);
}
