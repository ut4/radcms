#include "../../include/web/website-handlers.h"

unsigned
websiteHandlersHandlePageRequest(void *this, const char *method, const char *url,
                                 struct MHD_Response **response) {
    Page *p = siteGraphFindPage(&((Website*)this)->siteGraph, url);
    if (!p) {
        return MHD_HTTP_NOT_FOUND;
    }
    *response = MHD_create_response_from_buffer(strlen(p->url), (void*)p->url,
                                                MHD_RESPMEM_PERSISTENT);
    return MHD_HTTP_OK;
}
