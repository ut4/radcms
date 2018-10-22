#include "../../include/web/website-handlers.h"

static bool
fetchAndRenderBatches(Website *site, VTree *vTree, DocumentDataConfig *ddc,
                      char *err) {
    ComponentArray components;
    bool success = false;
    if (!websiteFetchBatches(site, ddc, &components, err)) {
        goto done;
    }
    DataBatchConfig *cur = &ddc->batches;
    while (cur) {
        if (!cur->renderWith) {
            putError("Invalid DataBatchConfig.\n");
            goto done;
        }
        //
        {
            STR_CONCAT(templateFilePath, site->rootDir, cur->renderWith);
            char *templateCode = fileIOReadFile(templateFilePath, err);
            unsigned templateRootNodeId = 0;
            if (!templateCode) {
                goto done;
            }
            if ((templateRootNodeId = vTreeScriptBindingsExecTemplate(site->dukCtx,
                templateCode, vTree, cur->id, &components, cur->isFetchAll,
                err)) < 1) {
                FREE_STR(templateCode);
                goto done;
            }
            FREE_STR(templateCode);
            if (!vTreeReplaceRef(vTree, TYPE_DATA_BATCH_CONFIG,
                                 cur->id,
                                 vTreeUtilsMakeNodeRef(TYPE_ELEM, templateRootNodeId))) {
                goto done;
            }
        }
        cur = cur->next;
    }
    success = true;
    done:
    componentArrayFreeProps(&components);
    return success;
}

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
    DocumentDataConfig ddc;
    char *renderedHtml = NULL;
    if (!vTreeScriptBindingsExecLayout(site->dukCtx, layoutCode, &vTree, &ddc,
                                       err)) {
        goto done;
    }
    if (ddc.batchCount > 0 && !fetchAndRenderBatches(site, &vTree, &ddc, err)) {
        goto done;
    }
    renderedHtml = vTreeToHtml(&vTree, err);
    done:
    FREE_STR(layoutCode);
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
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
