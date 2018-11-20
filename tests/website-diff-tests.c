#include "website-diff-tests.h"

static void
testSiteGraphDiffMakeSpotsNewLinks() {
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    duk_context *ctx = myDukCreate(errBuf);
    if (!ctx) { printToStdErr("Failed to create duk_context\n"); exit(EXIT_FAILURE); }
    vTreeScriptBindingsRegister(ctx);
    //
    Website site;
    websiteInit(&site);
    site.dukCtx = ctx;
    Template *l = siteGraphAddTemplate(&site.siteGraph, copyString("foo.js"));
    l->exists = true;
    Page *p = siteGraphAddPage(&site.siteGraph, 1, copyString("/"), 0, 0);
    #define newLinkUrl "/foo"
    char *updatedLayoutTmpl = "function (ddc, url) {"
        "return function(vTree) {"
            "vTree.registerElement('div', null,"
                "vTree.registerElement('a', {layoutFileName:'foo.js',href:'"newLinkUrl"'}, 'Hello')"
            ");"
        "}"
    "}";
    char *rendered = NULL;
    if (!testUtilsCompileAndCache(ctx, updatedLayoutTmpl, l->fileName, errBuf)) {
        printToStdErr("%s", errBuf); goto done;
    }
    //
    struct SiteGraphDiff diff;
    diff.newPages = NULL;
    rendered = pageRender(&site, p->layoutIdx, "/", siteGraphDiffMake,
                          &diff, errBuf);
    if (!rendered) { printToStdErr("Failed to render the test layout.\n"); goto done; }
    assertThatOrGoto(diff.newPages != NULL, done, "Should add new page to diff");
    assertStrEquals(diff.newPages->url, newLinkUrl);
    assertThatOrGoto(siteGraphFindPage(&site.siteGraph, newLinkUrl) != NULL, done,
                     "Should add new page to siteGraph");
    done:
        if (rendered) FREE_STR(rendered);
        duk_destroy_heap(ctx);
        websiteFreeProps(&site);
}

void
websiteDiffTestsRun() {
    testSiteGraphDiffMakeSpotsNewLinks();
}

