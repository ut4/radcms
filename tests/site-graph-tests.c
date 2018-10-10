#include "site-graph-tests.h"

static void testSiteGraphParseFailsOnEmptyInput() {
    PageArray testGraph;
    char errBuf[ERR_BUF_LEN];
    char empty[1] = {'\0'};
    bool ok = siteGraphParse(empty, &testGraph, errBuf);
    assertThat(!ok, "parse() should return false");
    assertStrEquals(errBuf, "ParseError: Expected a digit but got '\0");
}

static void testSiteGraphParseParsesTheInput() {
    PageArray testGraph;
    char errBuf[ERR_BUF_LEN];
    char serialized[40] = {
        '5','|',                                 // 5 pages total
        '2','4','/','|','0','|',                 // id=24, url=/, parentId=0
        '5','/','f','o','o','|','0','|',         // id=5, url=/foo, parentId=0
            '8','/','f','/','b','|','5','|',     // id=8, url=/f/b, parentId=5
                '6','/','b','/','z','|','8','|', // id=8, url=/f/b, parentId=8
        '2','/','b','a','z','|','0',             // id=2, url=/baz, parentId=0
        '\0'
    };
    bool ok = siteGraphParse(serialized, &testGraph, errBuf);
    assertThat(ok, "parse() should return true");
    assertIntEquals(testGraph.length, 5);
    assertIntEquals(testGraph.values[0].id, 24);
    assertStrEquals(testGraph.values[0].url, "/");
    assertIntEquals(testGraph.values[0].parentId, 0);
    assertIntEquals(testGraph.values[1].id, 5);
    assertStrEquals(testGraph.values[1].url, "/foo");
    assertIntEquals(testGraph.values[1].parentId, 0);
    assertIntEquals(testGraph.values[2].id, 8);
    assertStrEquals(testGraph.values[2].url, "/f/b");
    assertIntEquals(testGraph.values[2].parentId, 5);
    assertIntEquals(testGraph.values[3].id, 6);
    assertStrEquals(testGraph.values[3].url, "/b/z");
    assertIntEquals(testGraph.values[3].parentId, 8);
    assertIntEquals(testGraph.values[4].id, 2);
    assertStrEquals(testGraph.values[4].url, "/baz");
    assertIntEquals(testGraph.values[4].parentId, 0);
    pageArrayDestruct(&testGraph);
}

void testSiteGraphSerializeSerializesTheInput() {
    //
}

void siteGraphTestsRun() {
    testSiteGraphParseFailsOnEmptyInput();
    testSiteGraphParseParsesTheInput();
    testSiteGraphSerializeSerializesTheInput();
}
