#include "site-graph-tests.h"

static void
testSiteGraphParseFailsOnEmptyInput() {
    // 1. Setup
    SiteGraph testGraph;
    StrReader strReader;
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
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
    SiteGraph testGraph;
    siteGraphInit(&testGraph);
    StrReader strReader;
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    char *serialized =
        "5|"                 // 5 pages total
        "2|"                 // 2 templates total
        "24/|0|a.b|"         // id=24, url=/, parentId=0, layoutFileName=a.b
        "5/foo|0|a|"         // id=5, url=/foo, parentId=0, layoutFileName=a
            "8/f/b|5|b|"     // id=8, url=/f/b, parentId=5, layoutFileName=b
                "6/b/z|8|c|" // id=8, url=/f/b, parentId=8, layoutFileName=c
        "2/baz|0|d|"         // id=2, url=/baz, parentId=0, layoutFileName=d
        "foo.bar|"           // 1. template
        "baz.bar"            // 2. template
        ;
    // 2. Call
    bool ok = siteGraphParse(serialized, &testGraph, &strReader, errBuf);
    // 3. Assert
    assertThatOrGoto(ok, done, "parse() should return true");
    assertIntEquals(testGraph.pages.size, 5);
    Page *p1 = siteGraphFindPage(&testGraph, "/");
    assertThatOrGoto(p1 != NULL, done, "Sanity *p1 != NULL");
    assertIntEquals(p1->id, 24);
    assertStrEquals(p1->url, "/");
    assertIntEquals(p1->parentId, 0);
    assertStrEquals(p1->layoutFileName, "a.b");
    Page *p2 = siteGraphFindPage(&testGraph, "/foo");
    assertThatOrGoto(p2 != NULL, done, "Sanity *p2 != NULL");
    assertIntEquals(p2->id, 5);
    assertStrEquals(p2->url, "/foo");
    assertIntEquals(p2->parentId, 0);
    assertStrEquals(p2->layoutFileName, "a");
    Page *p3 = siteGraphFindPage(&testGraph, "/f/b");
    assertThatOrGoto(p3 != NULL, done, "Sanity *p3 != NULL");
    assertIntEquals(p3->id, 8);
    assertStrEquals(p3->url, "/f/b");
    assertIntEquals(p3->parentId, 5);
    assertStrEquals(p3->layoutFileName, "b");
    Page *p4 = siteGraphFindPage(&testGraph, "/b/z");
    assertThatOrGoto(p4 != NULL, done, "Sanity *p4 != NULL");
    assertIntEquals(p4->id, 6);
    assertStrEquals(p4->url, "/b/z");
    assertIntEquals(p4->parentId, 8);
    assertStrEquals(p4->layoutFileName, "c");
    Page *p5 = siteGraphFindPage(&testGraph, "/baz");
    assertThatOrGoto(p5 != NULL, done, "Sanity *p5 != NULL");
    assertIntEquals(p5->id, 2);
    assertStrEquals(p5->url, "/baz");
    assertIntEquals(p5->parentId, 0);
    assertStrEquals(p5->layoutFileName, "d");
    //
    assertIntEquals(testGraph.tmplFiles.length, 2);
    assertStrEquals(testGraph.tmplFiles.values[0].chars, "foo.bar");
    assertStrEquals(testGraph.tmplFiles.values[1].chars, "baz.bar");
    done:
        siteGraphFreeProps(&testGraph);
}

static void testSiteGraphSerializeSerializesTheInput() {
    //
}

void siteGraphTestsRun() {
    testSiteGraphParseFailsOnEmptyInput();
    testSiteGraphParseParsesTheInput();
    testSiteGraphSerializeSerializesTheInput();
}
