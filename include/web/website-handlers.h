#ifndef insn_websiteHandlers_h
#define insn_websiteHandlers_h

#include <cJSON.h>
#include <curl/curl.h>
#include "../events.h" // emitEvent()
#include "../file-io.h" // fileIO*()
#include "web-app-common.h" // microhttpd
#include "website-handlers-funcs.h"
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
 *     sitePath: '/some/path/',
 *     outDir: 'my/dir',
 *     issues: ['/some-url>Some error.']
 * }
 */
unsigned
websiteHandlersHandleGenerateRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Connection *conn,
                                     struct MHD_Response **response, char *err);

/**
 * Responds to POST /api/website/upload. Payload:
 * remoteUrl=str|required&
 * username=str|required&
 * password=str|required
 */
unsigned
websiteHandlersHandleUploadRequest(void *myPtr, void *myDataPtr, const char *method,
                                   const char *url, struct MHD_Connection *conn,
                                   struct MHD_Response **response, char *err);

FormDataHandlers*
websiteHandlersGetUploadDataHandlers();

#endif