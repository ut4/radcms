#include "../include/website-fw-handlers.h"

static void
handleFileModifyEvent(const char *fileName, Website *this, char *err);

void
websiteHandleFWEvent(FWEventType type, const char *fileName, void *myPtr) {
    Website *this = myPtr;
    char *err = this->errBuf;
    if (type == FW_ACTION_ADDED) {
        //
    } else if (type == FW_ACTION_MODIFIED) {
        handleFileModifyEvent(fileName, this, err);
    } else if (type == FW_ACTION_DELETED) {
        //
    }
}

bool
websiteCheckIsFWFileAcceptable(const char *fileName) {
    char *ext = strrchr(fileName, '.');
    return ext && strcmp(ext, ".js") == 0;
}

static void
handleFileModifyEvent(const char *fileName, Website *this, char *err) {
    int layoutIdx = -1;
    Template *layout = siteGraphFindTemplate(&this->siteGraph, (char*)fileName,
                                             &layoutIdx);
    assert(layout != NULL && "An unknown file was modified.");
    duk_push_thread_stash(this->dukCtx, this->dukCtx);
    if (!websiteCacheTemplate(this, fileName, err)) {
        printToStdErr("%s", err);
        duk_pop(this->dukCtx);
        return;
    }
    //
    struct SiteGraphDiff diff;
    diff.newPages = NULL;
    char *rendered = pageRender(this, layoutIdx, "/", siteGraphDiffMake,
                                &diff, err);
    if (!rendered) goto done;
    FREE_STR(rendered);
    if (!diff.newPages) goto done;
    if (!websiteSaveToDb(this, err)) {
        printToStdErr("Failed to save the site-graph: %s\n", err);
    }
    done:
    duk_pop(this->dukCtx);
}
