#pragma once

#include <cassert>
#include <cstring>
#include <fcntl.h> // O_RDONLY
#include <sys/stat.h> // fstat
#include "duk.hpp"
#include "web-app.hpp" // microhttpd
#include "js-environment.hpp"

/**
 * Responds to GET /<any>.html|js|css|svg eg. "/frontend/cpanel.html"
 */
unsigned
coreHandlersHandleStaticFileRequest(void *myPtr, void *myDataPtr, const char *method,
                                    const char *url, struct MHD_Connection *conn,
                                    struct MHD_Response **response, std::string &err);

/**
 * Forwards <ANY> <any> eg. GET "/some-page", POST "/component/1" to a
 * javascript-matcher/handler.
 */
unsigned
coreHandlersHandleScriptRouteRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Connection *conn,
                                     struct MHD_Response **response, std::string &err);

FormDataHandlers*
coreHandlersGetScriptRoutePostDataHandlers(duk_context *dukCtx);
