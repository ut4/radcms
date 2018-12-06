#include "website-tests.h"

static bool logPageWriteCall(char *renderedHtml, Page *page, Website *site,
                             void *myPtr, char *err);

static void
testWebsiteGeneratePassesEachPageToWriteFn(duk_context *ctx, char *err) {
    Website site;
    websiteInit(&site);
    site.dukCtx = ctx;
    TextNodeArray log;
    textNodeArrayInit(&log);
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
    websiteGenerate(&site, logPageWriteCall, &log, err);
    //
    assertThatOrGoto(log.length == 2, done, "Should pass each page to writeFn");
    assertThatOrGoto(log.values[0].chars != NULL, done, "renderedHtml #0 != NULL");
    assertStrEquals(log.values[0].chars, "<p>a</p>");
    assertThatOrGoto(log.values[1].chars != NULL, done, "renderedHtml #1 != NULL");
    assertStrEquals(log.values[1].chars, "<p>b</p>");
    done:
        websiteFreeProps(&site);
        textNodeArrayFreeProps(&log);
}

static void
storePageDataToStr(SiteGraph *this, VTree *vTree, void *dukCtx, void *toMyPtr,
                 char *err) {
    duk_context *ctx = dukCtx;
    duk_push_thread_stash(ctx, ctx);                    // [stash]
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
    duk_push_thread_stash(ctx, ctx);                                   // [stash]
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
                                &actualDataStr, err);
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

void
websiteTestsRun() {
    /*
     * Before
     */
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    duk_context *ctx = myDukCreate(errBuf);
    ASSERT(ctx != NULL, "Failed to create duk_context");
    commonScriptBindingsInit(ctx, NULL, errBuf);
    vTreeScriptBindingsInit(ctx);
    dataQueryScriptBindingsInit(ctx);
    websiteScriptBindingsInit(ctx, errBuf);
    /*
     * The tests
     */
    testWebsiteGeneratePassesEachPageToWriteFn(ctx, errBuf);
    testPageRenderPopulatesPageData(ctx, errBuf);
    /*
     * After
     */
    duk_destroy_heap(ctx);
}

static bool logPageWriteCall(char *renderedHtml, Page *page, Website *site,
                             void *myPtr, char *err) {
    TextNodeArray *log = myPtr;
    TextNode stored;
    stored.id = 0;
    stored.chars = copyString(renderedHtml);
    textNodeArrayPush(log, &stored);
    return true;
}
