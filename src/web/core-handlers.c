#include "../../include/web/core-handlers.h"

unsigned
coreHandlersHandleStaticFileRequest(void *myPtr, void *myDataPtr, const char *method,
                                    const char *url, struct MHD_Connection *conn,
                                    struct MHD_Response **response, char *err) {
    if (strcmp(method, "GET") != 0) return 0;
    // Must have an extension
    char *ext = strrchr(url, '.');
    if (!ext) return 0;
    // Mustn't contain ".."
    if (strstr(url, "..")) return MHD_HTTP_NOT_FOUND;
    // Must end with .(js|html|css|svg)
    bool isJs = strcmp(ext, ".js") == 0;
    bool isHtml = !isJs ? strcmp(ext, ".html") == 0 : false;
    bool isCss = !isHtml ? strcmp(ext, ".css") == 0 : false;
    if (!isJs && !isHtml && !isCss && strcmp(ext, ".svg") != 0) {
        return MHD_HTTP_NOT_FOUND;
    }
    // Must exist
    int fd;
    struct stat sbuf;
    bool isUserFile = strstr(url, "/frontend/") != url;
    char *rootPath = isUserFile ? ((WebApp*)myPtr)->sitePath : ((WebApp*)myPtr)->appPath;
    STR_CONCAT(path, rootPath, url);
    if ((fd = open(path, O_RDONLY)) == -1 || fstat(fd, &sbuf) != 0) {
        if (fd != -1) (void)close(fd);
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    *response = MHD_create_response_from_fd_at_offset64(sbuf.st_size, fd, 0);
    if (isJs) MHD_add_response_header(*response, "Content-Type", "application/javascript");
    else if (isHtml) MHD_add_response_header(*response, "Content-Type", "text/html");
    else if (isCss) MHD_add_response_header(*response, "Content-Type", "text/css");
    else MHD_add_response_header(*response, "Content-Type", "image/svg+xml");
    MHD_add_response_header(*response, "Cache-Control", "public,max-age=86400");//24h
    return MHD_HTTP_OK;
}

unsigned
coreHandlersHandleScriptRouteRequest(void *myPtr, void *myDataPtr, const char *method,
                                     const char *url, struct MHD_Connection *conn,
                                     struct MHD_Response **response, char *err) {
    if (strstr(url, "/api/") != url) return 0;
    unsigned out = MHD_HTTP_NOT_FOUND;
    duk_context *ctx = myPtr;
    ASSERT(duk_get_top(ctx) == 0, "Duk stack not empty.");
    duk_push_global_stash(ctx);                     // [stash]
    commonScriptBindingsPushApp(ctx, -1);           // [stash app]
    duk_get_prop_string(ctx, -1, "_routes");        // [stash app routes]
    duk_size_t l = duk_get_length(ctx, -1);
    for (duk_size_t i = 0; i < l; ++i) {
        duk_get_prop_index(ctx, -1, i);             // [stash app routes fn]
        duk_push_string(ctx, method);               // [stash app routes fn str]
        duk_push_string(ctx, url);                  // [stash app routes fn str str]
        /*
         * Call the matcher function.
         */
        if (duk_pcall(ctx, 2) != DUK_EXEC_SUCCESS) {// [stash app routes fn|null|err]
            dukUtilsPutDetailedError(ctx, -1, url, err); // [stash app routes]
            goto done;
        }
        /*
         * Wasn't interested.
         */
        if (!duk_is_function(ctx, -1)) {
            duk_pop(ctx);                           // [stash app routes]
            continue;
        }
        /*
         * Got a handler function, call it.
         */
        if (duk_pcall(ctx, 0) != DUK_EXEC_SUCCESS) {// [stash app routes obj|err]
            dukUtilsPutDetailedError(ctx, -1, url, err); // [stash app routes]
            out = MHD_HTTP_INTERNAL_SERVER_ERROR;
            goto done;
        }
        /*
         * Got a response.
         */
        bool didReturnObj = duk_is_object(ctx, -1);
        if (didReturnObj && duk_get_prop_string(ctx, -1, "statusCode")) {
            out = duk_to_uint(ctx, -1);
            duk_get_prop_string(ctx, -2, "body");   // [stash app routes res statcode body]
            const char *body = duk_to_string(ctx, -1);
            *response = MHD_create_response_from_buffer(strlen(body), (void*)body,
                                                        MHD_RESPMEM_MUST_COPY);
            duk_pop_n(ctx, 2);                      // [stash app routes res]
            duk_get_prop_string(ctx, -1, "headers");// [stash app routes res headers]
            duk_enum(ctx, -1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [stash app routes res headers enum]
            while (duk_next(ctx, -1, true)) {       // [stash app routes res headers enum key val]
                MHD_add_response_header(*response, duk_get_string(ctx, -2),
                                        duk_get_string(ctx, -1));
                duk_pop_n(ctx, 2);
            }                                       // [stash app routes res headers enum]
            duk_pop_n(ctx, 3);                      // [stash app routes]
        } else {
            if (didReturnObj) duk_pop(ctx);         // [stash app routes]
            putError("A handler must return new Response(<statusCode>, <bodyStr>)");
            out = MHD_HTTP_INTERNAL_SERVER_ERROR;
        }
        break;
    }
                                                    // [stash app routes]
    done:
    duk_pop_n(ctx, 3);                              // []
    return out;
}
