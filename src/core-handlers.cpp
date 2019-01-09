#include "../../include/core-handlers.hpp"

constexpr const char* KEY_CUR_CHUNK_RESP_OBJ = "_curChunkRespJsObj";
constexpr const char* KEY_HAD_ERROR = DUK_HIDDEN_SYMBOL("_hadError");
constexpr const int MIN_CHUNK_LIMIT = 64;

static unsigned processAndQueueBasicResponse(duk_context*, struct MHD_Response**);
static unsigned processAndQueueChunkedResponse(duk_context*, struct MHD_Response**);
static ssize_t pullAndSendChunkFromJs(void*, uint64_t , char*, size_t);
static void finalizeChunkedReq(void*);

unsigned
coreHandlersHandleStaticFileRequest(void *myPtr, void *myDataPtr, const char *method,
                                    const char *url, struct MHD_Connection *conn,
                                    struct MHD_Response **response, std::string &err) {
    if (strcmp(method, "GET") != 0) return MHD_NO;
    // Must have an extension
    const char *ext = strrchr(url, '.');
    if (!ext) return MHD_NO;
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
    std::string &rootPath = isUserFile
        ? static_cast<WebApp*>(myPtr)->ctx.sitePath
        : static_cast<WebApp*>(myPtr)->ctx.appPath;
    std::string path = rootPath + std::string(&url[1]);
    if ((fd = open(path.c_str(), O_RDONLY)) == -1 || fstat(fd, &sbuf) != 0) {
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
                                     struct MHD_Response **response, std::string &err) {
    unsigned out = MHD_HTTP_NOT_FOUND;
    auto *ctx = static_cast<duk_context*>(myPtr);
    assert(duk_get_top(ctx) == 0 && "Duk stack not empty.");
    duk_push_global_stash(ctx);                     // [stash]
    jsEnvironmentPushCommonService(ctx, "app");     // [stash app]
    duk_get_prop_string(ctx, -1, "_routeMatchers"); // [stash app routes]
    duk_size_t l = duk_get_length(ctx, -1);
    for (duk_size_t i = 0; i < l; ++i) {
        duk_get_prop_index(ctx, -1, i);             // [stash app routes fn]
        duk_push_string(ctx, url);                  // [stash app routes fn str]
        duk_push_string(ctx, method);               // [stash app routes fn str str]
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
        jsEnvironmentPushModuleProp(ctx, "http.js", "Request"); // [stash app routes fn Req]
        duk_push_string(ctx, url);                  // [stash app routes Req fn str str]
        duk_push_string(ctx, method);               // [stash app routes Req fn str]
        duk_new(ctx, 2);                            // [stash app routes req]
        if (duk_pcall(ctx, 1) != DUK_EXEC_SUCCESS) {// [stash app routes obj|err]
            dukUtilsPutDetailedError(ctx, -1, url, err); // [stash app routes]
            out = MHD_HTTP_INTERNAL_SERVER_ERROR;
            goto done;
        }
        /*
         * Process the response.
         */
        jsEnvironmentPushModuleProp(ctx, "http.js", "Response"); // [stash app routes res Resp]
        if (duk_instanceof(ctx, -2, -1)) {
            out = processAndQueueBasicResponse(ctx, response); // [stash app routes]
        } else if (jsEnvironmentPushModuleProp(ctx, "http.js", // [stash app routes res Resp ChunkedResp]
                                               "ChunkedResponse"),
                   duk_instanceof(ctx, -3, -1)) {
            out = processAndQueueChunkedResponse(ctx, response); // [stash app routes]
        } else {
            duk_pop_3(ctx);                         // [stash app routes]
            err = "A handler must return new Response(<statusCode>, <bodyStr>),"
                    " or new ChunkedResponse(<statusCode>, <chunkFn>, <any>)";
            out = MHD_HTTP_INTERNAL_SERVER_ERROR;
        }
        break;
    }
    done:
    duk_pop_3(ctx);                                 // []
    return out;
}

/** Validates new Response() (a return value of some js handler), and passes its
 * .body to MHD_create_response_from_buffer() */
static unsigned
processAndQueueBasicResponse(duk_context *ctx, struct MHD_Response **response) {
    duk_get_prop_string(ctx, -2, "statusCode"); // [stash app routes res Resp int]
    unsigned out = duk_to_uint(ctx, -1);
    duk_get_prop_string(ctx, -3, "body");   // [stash app routes res Resp int body]
    const char *body = duk_to_string(ctx, -1);
    *response = MHD_create_response_from_buffer(strlen(body), (void*)body,
                                                MHD_RESPMEM_MUST_COPY);
    duk_pop_3(ctx);                         // [stash app routes res]
    duk_get_prop_string(ctx, -1, "headers");// [stash app routes res headers]
    duk_enum(ctx, -1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [stash app routes res headers enum]
    while (duk_next(ctx, -1, true)) {       // [stash app routes res headers enum key val]
        MHD_add_response_header(*response, duk_get_string(ctx, -2),
                                duk_require_string(ctx, -1));
        duk_pop_2(ctx);                     // [stash app routes res headers enum]
    }
    duk_pop_3(ctx);                         // [stash app routes]
    return out;
}

/** Validates new ChunkedResponse(), stores it to a duktape stash, and calls
 * MHD_create_response_from_callback() */
static unsigned
processAndQueueChunkedResponse(duk_context *ctx, struct MHD_Response **response) {
    duk_get_prop_string(ctx, -3, "statusCode");   // [stash app routes res Resp ChunkedResp int]
    unsigned out = duk_get_uint(ctx, -1);
    duk_get_prop_string(ctx, -4, "chunkSizeMax"); // [stash app routes res Resp ChunkedResp int int]
    int chunkSizeMax = duk_get_int(ctx, -1);
    if (chunkSizeMax < MIN_CHUNK_LIMIT) chunkSizeMax = MIN_CHUNK_LIMIT;
    duk_pop_n(ctx, 4);                            // [stash app routes res]
    duk_push_boolean(ctx, false);                 // [stash app routes res bool]
    duk_put_prop_string(ctx, -2, KEY_HAD_ERROR);  // [stash app routes res]
    duk_put_prop_string(ctx, -4, KEY_CUR_CHUNK_RESP_OBJ); // [stash app routes]
    *response = MHD_create_response_from_callback(MHD_SIZE_UNKNOWN, chunkSizeMax,
                                                  pullAndSendChunkFromJs, ctx,
                                                  &finalizeChunkedReq);
    MHD_add_response_header(*response, "Transfer-Encoding", "chunked");
    MHD_add_response_header(*response, "Content-Type", "text/html;charset=utf-8");
    return out;
}

static int
writeToChunkBuf(const char *chunk, int len, size_t max, char *responseBuf,
                bool warnIfMoreThanMax) {
    sprintf(responseBuf, "%x\r\n", len);
    const int startLen = strlen(responseBuf);
    constexpr int endLen = 2; // last \r\n
    const int spaceLeft = max - endLen - startLen;
    if (len <= spaceLeft) {
        sprintf(responseBuf + startLen, "%s\r\n", chunk);
        return startLen + endLen + len;
    } else {
        if (warnIfMoreThanMax) std::cerr << "[Warn]: Response chunk too big " <<
                               len << "(max " << spaceLeft << "), sending only partially.\n";
        snprintf(responseBuf + startLen, spaceLeft, "%s\r\n", chunk);
        return spaceLeft;
    }
}

/** Calls chunkedResponse.getNextChunk(), and sends its return value to the
 * browser. A MHD_ContentReaderCallback of MHD_create_response_from_callback() */
static ssize_t
pullAndSendChunkFromJs(void *myPtr, uint64_t pos, char *responseBuf, size_t max) {
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_push_global_stash(ctx);                           // [stash]
    duk_get_prop_string(ctx, -1, KEY_CUR_CHUNK_RESP_OBJ); // [stash req]
    duk_get_prop_string(ctx, -1, KEY_HAD_ERROR);          // [stash req bool]
    // Previous getNextChunk() had an error -> end the response
    if (duk_get_boolean(ctx, -1)) {
        duk_pop_3(ctx);                                   // []
        return -1;
    }
    duk_pop(ctx);                                         // [stash req]
    duk_push_string(ctx, "getNextChunk");                 // [stash req fnName]
    duk_get_prop_string(ctx, -2, "chunkFnState");         // [stash req fnName state]
    // Call req.getNextChunk(state)
    if (duk_pcall_prop(ctx, -3, 1) == DUK_EXEC_SUCCESS) { // [stash req chunkStr]
        const char *chunk = duk_to_string(ctx, -1);
        int chunkContentLen = strlen(chunk);
        // getNextChunk() returned content -> send it to the browser
        if (chunkContentLen > 0) {
            unsigned totalChunkLen = writeToChunkBuf(chunk, chunkContentLen,
                                                     max, responseBuf, true);
            duk_pop_3(ctx);
            return totalChunkLen;
        } else {
            // getNextChunk() returned an empty string -> end the response
            duk_pop_3(ctx);                               // []
            return -1;
        }
    } else {
        // getNextChunk() threw an error -> return it to the browser and set the stop flag
        auto &buf = jsEnvironmentPullAppContext(ctx, -3)->errBuf;
        dukUtilsPutDetailedError(ctx, -1, "ChunkedResponse", buf); // [stash req]
        unsigned totalChunkLen = writeToChunkBuf(buf.c_str(), buf.length(), max,
                                                 responseBuf, false);
        buf.clear();
        duk_push_boolean(ctx, true);                      // [stash req true]
        duk_put_prop_string(ctx, -2, KEY_HAD_ERROR);      // [stash req]
        duk_pop_2(ctx);                                   // []
        return totalChunkLen;
    }
}

static void
finalizeChunkedReq(void *myPtr) {
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_push_global_stash(ctx);
    duk_push_null(ctx);
    duk_put_prop_string(ctx, -2, KEY_CUR_CHUNK_RESP_OBJ);
    duk_pop(ctx);
}
