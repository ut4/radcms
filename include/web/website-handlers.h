#ifndef insn_websiteHandlers_h
#define insn_websiteHandlers_h

#include "../web-app-common.h" // microhttpd
#include "website.h"

/**
 * Responds to GET /<any> eg "/" or "/foo" or "/foo/bar/baz".
 */
unsigned
websiteHandlersHandlePageRequest(void *this, const char *method, const char *url,
                                 struct MHD_Response **response);

#endif