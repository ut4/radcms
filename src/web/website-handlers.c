#include "../../include/web/website-handlers.h"

unsigned
websiteHandlersHandlePageRequest(void *this, const char *method, const char *url,
                                 struct MHD_Response **response, char *err) {
    Website *site = (Website*)this;
    Page *p = siteGraphFindPage(&site->siteGraph, url);
    if (!p) {
        return MHD_HTTP_NOT_FOUND;
    }
    STR_CONCAT(layoutFilePath, site->rootDir, p->layoutFileName);
    char *layoutCode = fileIOReadFile(layoutFilePath, err);
    if (!layoutCode) {
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    VTree vTree;
    char *renderedHtml = NULL;
    if (vTreeScriptBindingsExecLayout(site->dukCtx, layoutCode, &vTree, err)) {
        renderedHtml = vTreeToHtml(&vTree, err);
    }
    FREE_STR(layoutCode);
    vTreeDestruct(&vTree);
    if (!renderedHtml) {
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
#ifdef DEBUG_COUNT_ALLOC
    // freed by microhttpd
    memoryAddToByteCount(-(strlen(renderedHtml) + 1));
#endif
    *response = MHD_create_response_from_buffer(strlen(renderedHtml),
                                                (void*)renderedHtml,
                                                MHD_RESPMEM_MUST_FREE);
    return MHD_HTTP_OK;
}
