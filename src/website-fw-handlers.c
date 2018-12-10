#include "../include/website-fw-handlers.h"

static void handleFileModifyEvent(const char *fileName, Website *this, char *err);
static bool onRescanRequested(void *arg, void *myPtr);

void
websiteFWHandlersInit(Website *this) {
    onEvent("sitegraphRescanRequested", onRescanRequested, this);
}

void
websiteHandleFWEvent(FWEventType type, const char *fileName, void *myPtr) {
    Website *this = myPtr;
    char *err = this->errBuf;
    if (type == FW_EVENT_ADDED) {
        //
    } else if (type == FW_EVENT_MODIFIED) {
        handleFileModifyEvent(fileName, this, err);
    } else if (type == FW_EVENT_DELETED) {
        //
    }
}

bool
websiteCheckIsFWFileAcceptable(const char *fileName) {
    char *ext = strrchr(fileName, '.');
    return ext && strcmp(ext, ".js") == 0;
}

static bool
performRescan(Website *this, const char *url, int layoutIdx, char *err) {
    //
    bool success = false;
    SiteGraphDiff diff;
    siteGraphDiffInit(&diff);
    char *rendered = pageRender(this, layoutIdx, url, siteGraphDiffMake, &diff,
                                err);
    if (!rendered) goto done;
    FREE_STR(rendered);
    success = true;
    if (!diff.newPages) goto done;
    if (!websiteSaveToDb(this, err)) {
        putError("Error: Failed to save the site-graph: %s\n", err);
        success = false;
    }
    done:
    siteGraphDiffFreeProps(&diff);
    if (success) printf("Info: Rescanned '%s': %s.\n", url,
                        diff.newPages ? "added page(s)" : "no changes");
    else printToStdErr("%s", err);
    duk_pop(this->dukCtx);
    return success;
}

static void
handleFileModifyEvent(const char *fileName, Website *this, char *err) {
    int layoutIdx = -1;
    Template *layout = siteGraphFindTemplate(&this->siteGraph, (char*)fileName,
                                             &layoutIdx);
    ASSERT(layout != NULL, "An unknown file was modified.");
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    if (!websiteCacheTemplate(this, layout->fileName, err)) {
        printToStdErr("%s\n", err);
        duk_pop(this->dukCtx);
        return;
    }
    printf("Info: Cached %s\n", layout->fileName);
    (void)performRescan(this, layout->sampleUrl ? layout->sampleUrl : "/",
                        layoutIdx, err);
}

static bool
onRescanRequested(void *arg, void *myPtr) {
    Page *page = arg;
    Website *this = myPtr;
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    return performRescan(this, page->url, page->layoutIdx, this->errBuf);
}
