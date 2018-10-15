#include "site-graph-tests.h"

static void
testSiteGraphParseFailsOnEmptyInput() {
    // 1. Setup
    PageArray testGraph;
    StrReader strReader;
    char errBuf[ERR_BUF_LEN];
    char empty[1] = {'\0'};
    // 2. Call
    bool ok = siteGraphParse(empty, &testGraph, &strReader, errBuf);
    // 3. Assert
    assertThat(!ok, "parse() should return false");
    assertStrEquals(errBuf, "ParseError: Expected a digit but got '\0");
}

static void
testSiteGraphParseParsesTheInput() {
    // 1. Setup
    PageArray testGraph;
    StrReader strReader;
    char errBuf[ERR_BUF_LEN];
    char *serialized =
        "5|"                 // 5 pages total
        "24/|0|a.b|"         // id=24, url=/, parentId=0, layoutFileName=a.b
        "5/foo|0|a|"         // id=5, url=/foo, parentId=0, layoutFileName=a
            "8/f/b|5|b|"     // id=8, url=/f/b, parentId=5, layoutFileName=b
                "6/b/z|8|c|" // id=8, url=/f/b, parentId=8, layoutFileName=c
        "2/baz|0|d";         // id=2, url=/baz, parentId=0, layoutFileName=d
    // 2. Call
    bool ok = siteGraphParse(serialized, &testGraph, &strReader, errBuf);
    // 3. Assert
    assertThatOrGoto(ok, done, "parse() should return true");
    assertIntEquals(testGraph.length, 5);
    assertIntEquals(testGraph.values[0].id, 24);
    assertStrEquals(testGraph.values[0].url, "/");
    assertIntEquals(testGraph.values[0].parentId, 0);
    assertStrEquals(testGraph.values[0].layoutFileName, "a.b");
    assertIntEquals(testGraph.values[1].id, 5);
    assertStrEquals(testGraph.values[1].url, "/foo");
    assertIntEquals(testGraph.values[1].parentId, 0);
    assertStrEquals(testGraph.values[1].layoutFileName, "a");
    assertIntEquals(testGraph.values[2].id, 8);
    assertStrEquals(testGraph.values[2].url, "/f/b");
    assertIntEquals(testGraph.values[2].parentId, 5);
    assertStrEquals(testGraph.values[2].layoutFileName, "b");
    assertIntEquals(testGraph.values[3].id, 6);
    assertStrEquals(testGraph.values[3].url, "/b/z");
    assertIntEquals(testGraph.values[3].parentId, 8);
    assertStrEquals(testGraph.values[3].layoutFileName, "c");
    assertIntEquals(testGraph.values[4].id, 2);
    assertStrEquals(testGraph.values[4].url, "/baz");
    assertIntEquals(testGraph.values[4].parentId, 0);
    assertStrEquals(testGraph.values[4].layoutFileName, "d");
    done:
        pageArrayDestruct(&testGraph);
}

static void testSiteGraphSerializeSerializesTheInput() {
    //
}

void siteGraphTestsRun() {
    testSiteGraphParseFailsOnEmptyInput();
    testSiteGraphParseParsesTheInput();
    testSiteGraphSerializeSerializesTheInput();
}
