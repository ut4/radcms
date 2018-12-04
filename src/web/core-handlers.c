#include "../../include/web/core-handlers.h"

unsigned
coreHandlersHandleStaticFileRequest(void *myPtr, void *myDataPtr, const char *method,
                                    const char *url, struct MHD_Response **response,
                                    char *err) {
    if (strcmp(method, "GET") != 0 || strstr(url, "/frontend/") != url) return 0;
    if (strstr(url, "..")) return MHD_HTTP_NOT_FOUND;
    char *ext = strrchr(url, '.');
    if (!ext) return MHD_HTTP_NOT_FOUND;
    bool isJs = strcmp(ext, ".js") == 0;
    bool isHtml = !isJs ? strcmp(ext, ".html") == 0 : false;
    if (!isJs && !isHtml && strcmp(ext, ".css") != 0) {
        return MHD_HTTP_NOT_FOUND;
    }
    int fd;
    struct stat sbuf;
    char *appPath = myPtr;
    STR_CONCAT(path, appPath, url);
    if ((fd = open(path, O_RDONLY)) == -1 || fstat(fd, &sbuf) != 0) {
        if (fd != -1) (void)close(fd);
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    *response = MHD_create_response_from_fd_at_offset64(sbuf.st_size, fd, 0);
    if (isJs) MHD_add_response_header(*response, "Content-Type", "application/javascript");
    else if (isHtml) MHD_add_response_header(*response, "Content-Type", "text/html");
    else MHD_add_response_header(*response, "Content-Type", "text/css");
    MHD_add_response_header(*response, "Cache-Control", "public,max-age=86400");//24h
    return MHD_HTTP_OK;
}

unsigned
coreHandlersHandleScriptRouteRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Response **response,
                                     char *err) {
    if (strstr(url, "/api/") != url) return 0;
    unsigned out = MHD_HTTP_INTERNAL_SERVER_ERROR;
    duk_context *ctx = myPtr;
    ASSERT(duk_get_top(ctx) == 0, "Duk stack not empty.");
    duk_push_thread_stash(ctx, ctx);                // [stash]
    commonScriptBindingsPushApp(ctx, -1);           // [stash app]
    duk_get_prop_string(ctx, -1, "_routes");        // [stash app arr]
    duk_size_t l = duk_get_length(ctx, -1);
    for (duk_size_t i = 0; i < l; ++i) {
        duk_get_prop_index(ctx, -1, i);             // [stash app arr fn]
        duk_push_string(ctx, method);               // [stash app arr fn str]
        duk_push_string(ctx, url);                  // [stash app arr fn str str]
        /*
         * Call the matcher function.
         */
        if (duk_pcall(ctx, 2) != 0) {               // [stash app arr fn|null|err]
            dukUtilsPutDetailedError(ctx, -1, url, err); // [stash app arr]
            goto done;
        }
        /*
         * Wasn't interested.
         */
        if (!duk_is_function(ctx, -1)) {
            duk_pop(ctx);                           // [stash app arr]
            continue;
        }
        /*
         * Got a handler function, call it.
         */
        if (duk_pcall(ctx, 0) != 0) {               // [stash app arr obj|err]
            dukUtilsPutDetailedError(ctx, -1, url, err); // [stash app arr]
            goto done;
        }
        /*
         * Got a response.
         */
        bool didReturnObj = duk_is_object(ctx, -1);
        if (didReturnObj && duk_get_prop_string(ctx, -1, "statusCode")) { // [stash app arr obj number]
            out = duk_to_uint(ctx, -1);
            duk_get_prop_string(ctx, -2, "body");   // [stash app arr obj number str]
            const char *body = duk_to_string(ctx, -1);
            *response = MHD_create_response_from_buffer(strlen(body), (void*)body,
                                                        MHD_RESPMEM_MUST_COPY);
            duk_pop_n(ctx, 3);                      // [stash app arr]
        } else {
            if (didReturnObj) duk_pop(ctx);         // [stash app arr]
            putError("A handler must return new Response(<statusCode>, <bodyStr>)");
        }
        break;
    }
                                                    // [stash app arr]
    done:
    duk_pop_n(ctx, 3);                              // []
    return out;
}
