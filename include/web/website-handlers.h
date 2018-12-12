#ifndef insn_websiteHandlers_h
#define insn_websiteHandlers_h

#include <cJSON.h>
#include "../events.h" // emitEvent()
#include "../file-io.h" // fileIO*()
#include "web-app-common.h" // microhttpd
#include "../timer.h"
#include "../v-tree.h"
#include "../website.h"
#include "../website-script-bindings.h" // websiteScriptBindingsStrinfigyStashedPageData()

/**
 * Responds to GET /<any> eg "/" or "/foo" or "/foo/bar/baz".
 */
unsigned
websiteHandlersHandlePageRequest(void *myPtr, void *myDataPtr, const char *method,
                                 const char *url, struct MHD_Connection *conn,
                                 struct MHD_Response **response, char *err);

/**
 * Responds to GET /api/website/generate. Example response {
 *     wrotePagesNum: 5,
 *     tookSecs: 0.002672617,
 *     totalPages: 6,
 *     targetRoot: '/some/path/',
 *     targetDir: 'my/dir',
 *     issues: ['/some-url>Some error.']
 * }
 */
unsigned
websiteHandlersHandleGenerateRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Connection *conn,
                                     struct MHD_Response **response, char *err);

#endif