#include "website-mapper-tests.h"

static void
testWebsiteFetchAndParseSiteGraphDoesWhatIsSays() {
    // 1. Setup
    char errBuf[ERR_BUF_LEN];
    Website website;
    websiteInit(&website);
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        goto done;
    }
    // 2. Call
    if (!websiteFetchAndParseSiteGraph(&website, &db, errBuf)) {
        assertThatOrGoto(false, done, "Should fetch and parse the sitegraph");
    }
    // 3. Assert
    assertIntEqualsOrGoto(website.siteGraph.length, 2, done);
    assertIntEquals(website.siteGraph.values[0].id, 1);
    assertIntEquals(website.siteGraph.values[1].id, 2);
    done:
        websiteDestruct(&website);
        dbDestruct(&db);
}

void
websiteMapperTestsRun() {
    testWebsiteFetchAndParseSiteGraphDoesWhatIsSays();
}
