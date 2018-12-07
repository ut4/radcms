#ifndef insn_coreHandlers_h
#define insn_coreHandlers_h

#include <fcntl.h> // O_RDONLY
#include "../common-script-bindings.h" // commonScriptBindingsPushApp()
#include "../duk.h"
#include "../file-io.h"
#include "web-app-common.h" // microhttpd

/**
 * Responds to GET /frontend/<any>.html|js|css eg. "/frontend/cpanel.html"
 */
unsigned
coreHandlersHandleStaticFileRequest(void *myPtr, void *myDataPtr, const char *method,
                                    const char *url, struct MHD_Response **response,
                                    char *err);

/**
 * Responds to <ANY> /api/<any> eg. GET "/api/component/1"
 */
unsigned
coreHandlersHandleScriptRouteRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Response **response,
                                     char *err);

#endif