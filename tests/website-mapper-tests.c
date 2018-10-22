#include "website-mapper-tests.h"

#define beforeEach()

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
        websiteDestruct(&website);
}

static void
testWebsiteFetchBatchesFetchesDataOfDDCWithOneBatch(Db *db, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1,'test');"
        "insert into components values (1,'aname','{\"prop\":1}',1)"
    )) return;
    Website website;
    websiteInit(&website);
    website.db = db;
    Component cmp;
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    DataBatchConfig *dbc = documentDataConfigAddBatch(&ddc, "test", false);
    dataBatchConfigSetWhere(dbc, "name=\"aname\"");
    //
    bool success = websiteFetchBatches(&website, &cmp, &ddc, err);
    assertThatOrGoto(success, done, "Should return succesfully");
    assertIntEquals(cmp.id, 1);
    assertStrEquals(cmp.name, "aname");
    assertStrEquals(cmp.json, "{\"prop\":1}");
    assertIntEquals(cmp.dataBatchConfigId, 1);
    //
    done:
        websiteDestruct(&website);
        documentDataConfigDestruct(&ddc);
        componentFreeProps(&cmp);
        testUtilsExecSql(db,
            "delete from components where id = 1;"
            "delete from componentTypes where id = 1"
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
    testWebsiteFetchBatchesFetchesDataOfDDCWithOneBatch(&db, errBuf);
    dbDestruct(&db);
}
