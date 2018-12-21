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

static void
handleFileModifyEvent(const char *fileName, Website *this, char *err) {
    int layoutIdx = -1;
    Template *layout = siteGraphFindTemplate(&this->siteGraph, (char*)fileName,
                                             &layoutIdx);
    if (!layout) {
        printToStdErr("[Notice]: An unknown file was modified, skipping.");
        return;
    }
    duk_push_global_stash(this->dukCtx);
    if (!websiteCacheTemplate(this, layout->fileName, err)) {
        printToStdErr("%s\n", err);
        duk_pop(this->dukCtx);
        return;
    }
    printf("[Info]: Cached %s\n", layout->fileName);
    err[0] = '\0';
    (void)websiteDiffPerformRescan(this, layout->sampleUrl ? layout->sampleUrl :
                                   "/", layoutIdx, err);
    duk_pop(this->dukCtx);
}

static bool
onRescanRequested(void *arg, void *myPtr) {
    Page *page = arg;
    Website *this = myPtr;
    duk_push_global_stash(this->dukCtx);
    bool out = websiteDiffPerformRescan(this, page->url, page->layoutIdx,
                                        this->errBuf);
    duk_pop(this->dukCtx);
    return out;
}
