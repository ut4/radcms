#include "website-tests.h"

static bool logPageWriteCall(char *renderedHtml, Page *page, Website *site,
                             void *myPtr, char *err);

static void
testWebsiteGeneratePassesEachPageToWriteFn(duk_context *ctx, char *err) {
    Website site;
    websiteInit(&site);
    site.dukCtx = ctx;
    StrTube log = strTubeMake();
    Template *l1 = siteGraphAddTemplate(&site.siteGraph, copyString("a.js"));
    Template *l2 = siteGraphAddTemplate(&site.siteGraph, copyString("b.js"));
    (void)siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    (void)siteGraphAddPage(&site.siteGraph, 2, copyString("/foo"), 0, 1);
    if (!testUtilsCompileAndCache(ctx,
        "function(){return function(v){v.registerElement('p',null,'a'); };}",
        l1->fileName, err)) { printToStdErr("%s", err); goto done; }
    if (!testUtilsCompileAndCache(ctx,
        "function(){return function(v){v.registerElement('p',null,'b'); };}",
        l2->fileName, err)) { printToStdErr("%s", err); goto done; }
    //
    unsigned numWrites = websiteGenerate(&site, logPageWriteCall, &log, NULL, err);
    assertIntEqualsOrGoto(numWrites, 2, done);
    //
    assertIntEqualsOrGoto(log.length, 2, done);
    StrTubeReader reader = strTubeReaderMake(&log);
    char* first = strTubeReaderNext(&reader);
    assertThatOrGoto(first != NULL, done, "renderedHtml #0 != NULL");
    assertStrEquals(first, "<p>a</p>");
    char *second = strTubeReaderNext(&reader);
    assertThatOrGoto(second != NULL, done, "renderedHtml #1 != NULL");
    assertStrEquals(second, "<p>b</p>");
    done:
        websiteFreeProps(&site);
        strTubeFreeProps(&log);
}

static void
storePageDataToStr(SiteGraph *this, VTree *vTree, void *dukCtx, void *toMyPtr,
                 char *err) {
    duk_context *ctx = dukCtx;
    duk_push_global_stash(ctx);                         // [stash]
    duk_get_prop_string(ctx, -1, "_pageDataJsImpl");    // [stash pageData]
    duk_get_prop_string(ctx, -1, "directiveInstances"); // [stash pageData arr]
    duk_json_encode(ctx, -1);                           // [stash pageData str]
    *((char**)toMyPtr) = copyString(duk_get_string(ctx, -1));
    duk_pop_n(ctx, 3);
}

static void
testPageRenderPopulatesPageData(duk_context *ctx, char *err) {
    #define MOCK_COMPONENT1 "{\"title\":\"Foo\",\"body\":\"bar\",\"cmp\":{\"id\":11,\"name\":\"/aa\"}}"
    #define MOCK_COMPONENT2 "{\"title\":\"Bar\",\"body\":\"baz\",\"cmp\":{\"id\":22,\"name\":\"/bb\"}}"
    const char *testDirective = "function (vTree, components) {"
        "return vTree.registerElement('div', null, 'foo');"
    "}";
    //
    Website site;
    websiteInit(&site);
    site.dukCtx = ctx;
    Template *l = siteGraphAddTemplate(&site.siteGraph, copyString("foo.js"));
    Page *p = siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    const char *testLayoutTmpl = "function (ddc, url) {"
        "return function(vTree, pageData) {"
            "var mockComponent1 = "MOCK_COMPONENT1";"
            "var mockComponent2 = "MOCK_COMPONENT2";"
            "vTree.registerElement('div', null, ["
                "pageData.callDirective('TestDirective', vTree, [mockComponent1]),"
                "pageData.callDirective('AnotherDirective', vTree, "
                                       "[mockComponent1, mockComponent2])"
            "]);"
        "}"
    "}";
    duk_push_global_stash(ctx);                                        // [stash]
    if (!testUtilsCompileAndCache(ctx, testLayoutTmpl, l->fileName, err)) {
        printToStdErr("%s", err); goto done;
    }
    if (dukUtilsCompileStrToFn(ctx, testDirective, "test-directive.js", err)) {
        duk_dup(ctx, -1);                                              // [stash fn fn]
        commonScriptBindingsPutDirective(ctx, "TestDirective", -3);    // [stash fn]
        commonScriptBindingsPutDirective(ctx, "AnotherDirective", -2); // [stash]
    } else {
        printToStdErr("Failed to compile test directive."); goto done;
    }
    //
    char *actualDataStr = NULL;
    char *rendered = pageRender(&site, p->layoutIdx, "/", storePageDataToStr,
                                &actualDataStr, NULL, err);
    assertThatOrGoto(rendered != NULL, done, "Should render succefully");
    FREE_STR(rendered);
    assertThatOrGoto(actualDataStr != NULL, done, "Sanity actualDataStr != NULL");
    assertStrEquals(actualDataStr, "[{"
        "\"id\":1,"
        "\"type\":\"TestDirective\","
        "\"components\":["MOCK_COMPONENT1"]"
    "},{"
        "\"id\":2,"
        "\"type\":\"AnotherDirective\","
        "\"components\":["MOCK_COMPONENT1","MOCK_COMPONENT2"]"
    "}]");
    FREE_STR(actualDataStr);
    done:
        duk_set_top(ctx, 0);
        websiteFreeProps(&site);
    #undef MOCK_COMPONENT1
    #undef MOCK_COMPONENT2
}

static void
testPageRenderPopulatesIssuesArgument(duk_context *ctx, char *err) {
    //
    Website site;
    websiteInit(&site);
    site.dukCtx = ctx;
    Template *l = siteGraphAddTemplate(&site.siteGraph, copyString("foo.js"));
    l->exists = false;
    Page *p = siteGraphAddPage(&site.siteGraph, 1, copyString("/foo"), 0, 0);
    //
    StrTube issues = strTubeMake();
    char *rendered = pageRender(&site, p->layoutIdx, "/foo", NULL, NULL, &issues, err);
    assertThatOrGoto(rendered != NULL, done, "Should return succefully");
    FREE_STR(rendered);
    StrTubeReader reader = strTubeReaderMake(&issues);
    char *first = strTubeReaderNext(&reader);
    assertThatOrGoto(first != NULL, done, "Should add first warning");
    assertStrEquals(first, "/foo>Layout file 'foo.js' doesn't exists yet.");
    done:
        duk_set_top(ctx, 0);
        websiteFreeProps(&site);
        strTubeFreeProps(&issues);
}

void
websiteTestsRun() {
    /*
     * Before
     */
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    duk_context *ctx = myDukCreate(errBuf);
    ASSERT(ctx != NULL, "Failed to create duk_context");
    commonScriptBindingsInit(ctx, NULL, NULL, errBuf);
    vTreeScriptBindingsInit(ctx);
    dataQueryScriptBindingsInit(ctx);
    websiteScriptBindingsInit(ctx, errBuf);
    /*
     * The tests
     */
    testWebsiteGeneratePassesEachPageToWriteFn(ctx, errBuf);
    testPageRenderPopulatesPageData(ctx, errBuf);
    testPageRenderPopulatesIssuesArgument(ctx, errBuf);
    /*
     * After
     */
    duk_destroy_heap(ctx);
}

static bool logPageWriteCall(char *renderedHtml, Page *page, Website *site,
                             void *myPtr, char *err) {
    strTubePush(myPtr, renderedHtml);
    return true;
}
