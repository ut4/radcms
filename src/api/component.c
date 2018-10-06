#include "../../include/api/component.h"

static const char *foo = "{\"id\":1}";
static const char *bar = "[{\"id\":1}, {\"id\":2}]";

unsigned int
componentGetAll(struct MHD_Response **res) {
    *res = MHD_create_response_from_buffer(strlen(bar), (void*)bar,
                                           MHD_RESPMEM_PERSISTENT);
    return MHD_HTTP_OK;
}

bool
componentIsPutUrl(const char *url) {
    return strstr(url, "/api/component/") == url;
}

unsigned int
componentUpdate(struct MHD_Response **res) {
    *res = MHD_create_response_from_buffer(strlen(foo), (void*)foo,
                                           MHD_RESPMEM_PERSISTENT);
    return MHD_HTTP_OK;
}
