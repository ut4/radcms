#ifndef insn_websiteHandlers_h
#define insn_websiteHandlers_h

#include "../file-io.h" // fileIO*()
#include "../web-app-common.h" // microhttpd
#include "../v-tree-script-bindings.h" // vTreeScriptBindings*()
#include "website.h"

/**
 * Responds to GET /<any> eg "/" or "/foo" or "/foo/bar/baz".
 */
unsigned
websiteHandlersHandlePageRequest(void *this, const char *method, const char *url,
                                 struct MHD_Response **response, char *err);

/**
 * Responds to GET /int/cpanel.
 */
unsigned
websiteHandlersHandleCPanelIframeRequest(void *this, const char *method, const char *url,
                                         struct MHD_Response **response, char *err);

/**
 * Responds to /api/website/generate.
 */
unsigned
websiteHandlersHandleGenerateRequest(void *this, const char *method, const char *url,
                                     struct MHD_Response **response, char *err);

#endif