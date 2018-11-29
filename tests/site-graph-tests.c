#include "site-graph-tests.h"

static void
testSiteGraphParseFailsOnEmptyInput() {
    // 1. Setup
    SiteGraph testGraph;
    siteGraphInit(&testGraph);
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
        "24/|0|0|"           // id=24, url=/,   parentId=0, layoutIdx=0
        "5/foo|0|1|"         // id=5, url=/foo, parentId=0, layoutIdx=1
            "8/f/b|5|0|"     // id=8, url=/f/b, parentId=5, layoutIdx=0
                "6/b/z|8|1|" // id=8, url=/f/b, parentId=8, layoutIdx=1
        "2/baz|0|1|"         // id=2, url=/baz, parentId=0, layoutIdx=1
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
    assertIntEquals(p1->layoutIdx, 0);
    Page *p2 = siteGraphFindPage(&testGraph, "/foo");
    assertThatOrGoto(p2 != NULL, done, "Sanity *p2 != NULL");
    assertIntEquals(p2->id, 5);
    assertStrEquals(p2->url, "/foo");
    assertIntEquals(p2->parentId, 0);
    assertIntEquals(p2->layoutIdx, 1);
    Page *p3 = siteGraphFindPage(&testGraph, "/f/b");
    assertThatOrGoto(p3 != NULL, done, "Sanity *p3 != NULL");
    assertIntEquals(p3->id, 8);
    assertStrEquals(p3->url, "/f/b");
    assertIntEquals(p3->parentId, 5);
    assertIntEquals(p3->layoutIdx, 0);
    Page *p4 = siteGraphFindPage(&testGraph, "/b/z");
    assertThatOrGoto(p4 != NULL, done, "Sanity *p4 != NULL");
    assertIntEquals(p4->id, 6);
    assertStrEquals(p4->url, "/b/z");
    assertIntEquals(p4->parentId, 8);
    assertIntEquals(p4->layoutIdx, 1);
    Page *p5 = siteGraphFindPage(&testGraph, "/baz");
    assertThatOrGoto(p5 != NULL, done, "Sanity *p5 != NULL");
    assertIntEquals(p5->id, 2);
    assertStrEquals(p5->url, "/baz");
    assertIntEquals(p5->parentId, 0);
    assertIntEquals(p5->layoutIdx, 1);
    //
    assertIntEquals(testGraph.templates.length, 2);
    Template *t1 = &testGraph.templates.values[0];
    assertStrEquals(t1->fileName, "foo.bar");
    Template *t2 = &testGraph.templates.values[1];
    assertStrEquals(t2->fileName, "baz.bar");
    //
    assertThatOrGoto(t1->sampleUrl != NULL, done, "Should set t1->sampleUrl");
    assertStrEquals(t1->sampleUrl, "/");
    assertThatOrGoto(t2->sampleUrl != NULL, done, "Should set t2->sampleUrl");
    assertStrEquals(t2->sampleUrl, "/foo");
    //
    done:
        siteGraphFreeProps(&testGraph);
}

static void
testSiteGraphSerializeSerializesTheInput() {
    SiteGraph testGraph;
    siteGraphInit(&testGraph);
    siteGraphAddPage(&testGraph, 1, copyString("/"), 0, 0);
    siteGraphAddPage(&testGraph, 24, copyString("/fod"), 0, 1);
    siteGraphAddPage(&testGraph, 5, copyString("/b/c"), 24, 0);
    siteGraphAddTemplate(&testGraph, copyString("mytmpl.js"));
    siteGraphAddTemplate(&testGraph, copyString("another.js"));
    //
    char *serialized = siteGraphSerialize(&testGraph);
    //
    assertThatOrGoto(serialized != NULL, done, "Should return succesfully");
    assertStrEquals(serialized,
        "3|"          // Page count
        "2|"          // Template count
        "1/|0|0|"     // #1 Page
        "24/fod|0|1|" // #2 Page
        "5/b/c|24|0|" // #3 Page
        "mytmpl.js|"  // #1 Template
        "another.js|" // #2 Template
    );
    done:
    siteGraphFreeProps(&testGraph);
    if (serialized) FREE_STR(serialized);
}

void siteGraphTestsRun() {
    testSiteGraphParseFailsOnEmptyInput();
    testSiteGraphParseParsesTheInput();
    testSiteGraphSerializeSerializesTheInput();
}
