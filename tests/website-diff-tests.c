#include "website-diff-tests.h"

static void
testSiteGraphDiffMakeSpotsNewLinks() {
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    duk_context *ctx = myDukCreate(errBuf);
    ASSERT(ctx != NULL, "Failed to create duk_context\n"); \
    vTreeScriptBindingsRegister(ctx);
    //
    Website site;
    websiteInit(&site);
    site.dukCtx = ctx;
    SiteGraphDiff diff;
    siteGraphDiffInit(&diff);
    Template *l = siteGraphAddTemplate(&site.siteGraph, copyString("foo.js"));
    l->exists = true;
    Page *p = siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    #define newLinkUrl1 "/foo"
    #define newLinkUrl2 "/bar"
    const char *updatedLayoutTmpl = "function (ddc, url) {"
        "return function(vTree) {"
            "vTree.registerElement('div', null, ["
                "vTree.registerElement('a', {layoutFileName:'foo.js',href:'"newLinkUrl1"'}, 'Hello'),"
                "vTree.registerElement('a', {layoutFileName:'foo.js',href:'"newLinkUrl2"'}, 'olleH')"
            "]);"
        "}"
    "}";
    if (!testUtilsCompileAndCache(ctx, updatedLayoutTmpl, l->fileName, errBuf)) {
        printToStdErr("%s", errBuf); goto done;
    }
    //
    char *rendered = pageRender(&site, p->layoutIdx, "/", siteGraphDiffMake,
                                &diff, errBuf);
    if (!rendered) { printToStdErr("Failed to render the test layout.\n"); goto done; }
    else { FREE_STR(rendered); }
    assertThatOrGoto(diff.newPages != NULL, done, "Sanity diff.newPages != NULL");
    assertThatOrGoto(siteGraphFindPage(&site.siteGraph, newLinkUrl1) != NULL,
                     done, "Should add new page #1 to siteGraph");
    Page *actual1 = diff.newPages->ptr;
    assertThatOrGoto(actual1 != NULL, done, "Should add page #1 to diff.newPages");
    assertStrEquals(actual1->url, newLinkUrl1);
    assertThatOrGoto(siteGraphFindPage(&site.siteGraph, newLinkUrl2) != NULL,
                     done, "Should add new page #2 to siteGraph");
    Page *actual2 = diff.newPages->next ? diff.newPages->next->ptr : NULL;
    assertThatOrGoto(actual2 != NULL, done, "Should add page #2 to diff.newPages");
    assertStrEquals(actual2->url, newLinkUrl2);
    done:
        duk_destroy_heap(ctx);
        siteGraphDiffFreeProps(&diff);
        websiteFreeProps(&site);
}

void
websiteDiffTestsRun() {
    testSiteGraphDiffMakeSpotsNewLinks();
}

