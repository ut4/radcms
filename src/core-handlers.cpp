#include "../../include/core-handlers.hpp"

constexpr const char* KEY_CUR_CHUNK_RESP_OBJ = "_curChunkRespJsObj";
constexpr const char* KEY_CUR_REQ_OBJ = "_currentReqObj";
constexpr const char* KEY_CUR_REQ_HANDLER_FN = "_currentReqJsHandlerFn";
constexpr const char* KEY_HAD_ERROR = DUK_HIDDEN_SYMBOL("_hadError");
constexpr const int MIN_CHUNK_LIMIT = 64;

static unsigned callScriptHandler(duk_context *ctx, const char *url,
                                  struct MHD_Response **response, std::string &err);
static unsigned processAndQueueBasicResponse(duk_context*, struct MHD_Response**);
static unsigned processAndQueueChunkedResponse(duk_context*, struct MHD_Response**);
static ssize_t pullAndSendChunkFromJs(void*, uint64_t , char*, size_t);
static void finalizeChunkedReq(void*);
static void initJsFormData(IncomingDataContentType ctype, void **myPtr);
static bool putJsFormDataVal(const char *key, const char *value, void *myPtr);
static void cleanJsFormData(void *myPtr);
static const char* getMime(const char *ext);

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
    // Must exist
    std::string &rootPath = strstr(url, "/frontend/") != url
        ? static_cast<AppEnv*>(myPtr)->dataPath
        : static_cast<AppEnv*>(myPtr)->appPath;
    struct stat sbuf;
    int fd = myFsGetFileInfo((rootPath + std::string(&url[1])).c_str(), &sbuf);
    if (fd < 0) return MHD_HTTP_NOT_FOUND;
    //
    *response = MHD_create_response_from_fd_at_offset64(sbuf.st_size, fd, 0);
    const char *mime = getMime(ext);
    if (mime) MHD_add_response_header(*response, "Content-Type", mime);
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
    duk_push_global_stash(ctx);                         // [stash]
    // First iteration
    if (!myDataPtr) {
        jsEnvironmentPushModuleProp(ctx, "app.js", "app"); // [stash app]
        duk_get_prop_string(ctx, -1, "_routeMatchers"); // [stash app routes]
        duk_size_t l = duk_get_length(ctx, -1);
        for (duk_size_t i = 0; i < l; ++i) {
            duk_get_prop_index(ctx, -1, i);             // [stash app routes fn]
            duk_push_string(ctx, url);                  // [stash app routes fn str]
            duk_push_string(ctx, method);               // [stash app routes fn str str]
            // Call the matcher function.
            if (duk_pcall(ctx, 2) != DUK_EXEC_SUCCESS) {// [stash app routes fn|null|err]
                dukUtilsPutDetailedError(ctx, -1, url, err); // [stash app routes]
                break;
            }
            // Wasn't interested.
            if (!duk_is_function(ctx, -1)) {
                duk_pop(ctx);                           // [stash app routes]
                continue;
            }
            // Got a handler function ...
            duk_replace(ctx, -3);                       // [stash fn routes]
            duk_pop(ctx);                               // [stash fn]
            httpJsBindingsPushNewRequest(ctx, conn, url, method); // [stash fn req]
            // ... GET -> call immediately
            if (strcmp(method, "GET") == 0) {
                out = callScriptHandler(ctx, url, response, err); // [stash ?]
            // ... POST|PUT -> continue to the data collecting -iteration
            } else {
                out = MHD_YES;
                duk_put_prop_string(ctx, -3,            // [stash fn]
                    KEY_CUR_REQ_OBJ);
                duk_put_prop_string(ctx, -2,            // [stash]
                    KEY_CUR_REQ_HANDLER_FN);
            }
            break;
        }
        // none of the matchers returned a function -> 404
    } else {
        // Second iteration, post-data is now populated
        duk_get_prop_string(ctx, -1, KEY_CUR_REQ_HANDLER_FN); // [stash fn]
        duk_get_prop_string(ctx, -2, KEY_CUR_REQ_OBJ);  // [stash fn req]
        out = callScriptHandler(ctx, url, response, err); // [stash ?]
    }
    duk_set_top(ctx, 0);                                // []
    return out;
}

FormDataHandlers*
coreHandlersGetScriptRoutePostDataHandlers(duk_context *dukCtx) {
    FormDataHandlers *out = new FormDataHandlers;
    out->init = initJsFormData;
    out->receiveVal = putJsFormDataVal;
    out->cleanup = cleanJsFormData;
    out->myPtr = dukCtx;
    return out;
}

/** Calls the js handler at the top of the stack, and processes its return
 * value (new Response(...)).*/
static unsigned
callScriptHandler(duk_context *ctx, const char *url,
                  struct MHD_Response **response, std::string &err) {
                                                              // [stash fn req]
    if (duk_pcall(ctx, 1) != DUK_EXEC_SUCCESS) {              // [stash res|err]
        dukUtilsPutDetailedError(ctx, -1, url, err);          // [stash]
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    jsEnvironmentPushModuleProp(ctx, "http.js", "Response");  // [stash res Resp]
    if (duk_instanceof(ctx, -2, -1)) {
        return processAndQueueBasicResponse(ctx, response);   // [stash ?]
    }
    jsEnvironmentPushModuleProp(ctx, "http.js",               // [stash res Resp ChunkedResp]
                                    "ChunkedResponse");
    if (duk_instanceof(ctx, -3, -1)) {
        return processAndQueueChunkedResponse(ctx, response); // [stash ?]
    }
    err = "A handler must return new Response(<statusCode>, <bodyStr>),"
          " or new ChunkedResponse(<statusCode>, <chunkFn>, <any>)";
    return MHD_HTTP_INTERNAL_SERVER_ERROR;
}

/* dukStash._pendingReqObj.data = {} */
static void
initJsFormData(IncomingDataContentType ctype, void **myPtr) {
    auto *ctx = static_cast<duk_context*>(*myPtr);
    duk_push_global_stash(ctx);                    // [stash]
    duk_get_prop_string(ctx, -1, KEY_CUR_REQ_OBJ); // [stash req]
    duk_push_uint(ctx, ctype);                     // [stash req ctype]
    duk_put_prop_string(ctx, -2, "_formDataContentType");// [stash req]
    duk_push_object(ctx);                          // [stash req data]
    duk_put_prop_string(ctx, -2, "data");          // [stash req]
    duk_pop_2(ctx);                                // []
}

/* dukStash._pendingReqObj.data[key] = value */
static bool
putJsFormDataVal(const char *key, const char *value, void *myPtr) {
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_push_global_stash(ctx);                    // [stash]
    duk_get_prop_string(ctx, -1, KEY_CUR_REQ_OBJ); // [stash req]
    duk_get_prop_string(ctx, -1, "_formDataContentType");// [stash req ctype]
    if (duk_get_uint(ctx, -1) == CONTENT_TYPE_JSON) {
        duk_push_string(ctx, value);               // [stash req ctype jsonstr]
        duk_json_decode(ctx, -1);                  // [stash req ctype jsonobj]
        duk_put_prop_string(ctx, -3, "data");      // [stash req ctype]
        duk_pop_3(ctx);                            // []
    } else {
        duk_get_prop_string(ctx, -2, "data");      // [stash req ctype data]
        duk_push_string(ctx, value);               // [stash req ctype data value]
        duk_put_prop_string(ctx, -2, key);         // [stash req ctype data]
        duk_pop_n(ctx, 4);                         // []
    }
    return true;
}

/* dukStash._pendingReqObj = null, dukStash._pendingJsHandlerFn = null */
static void
cleanJsFormData(void *myPtr) {
    auto *ctx = static_cast<duk_context*>(myPtr);
    duk_push_global_stash(ctx);                           // [stash]
    duk_push_null(ctx);                                   // [stash null]
    duk_put_prop_string(ctx, -2, KEY_CUR_REQ_OBJ);        // [stash]
    duk_push_null(ctx);                                   // [stash null]
    duk_put_prop_string(ctx, -2, KEY_CUR_REQ_HANDLER_FN); // [stash]
    duk_pop(ctx);                                         // []
}

/** Validates new Response() (a return value of some js handler), and passes its
 * .body to MHD_create_response_from_buffer(). Returns an http status code. */
static unsigned
processAndQueueBasicResponse(duk_context *ctx, struct MHD_Response **response) {
    duk_get_prop_string(ctx, -2, "statusCode");      // [stash res Resp int]
    unsigned out = duk_to_uint(ctx, -1);
    duk_get_prop_string(ctx, -3, "body");            // [stash res Resp int body]
    const char *body = duk_to_string(ctx, -1);
    *response = MHD_create_response_from_buffer(strlen(body), (void*)body,
                                                MHD_RESPMEM_MUST_COPY);
    duk_pop_3(ctx);                                  // [stash res]
    duk_get_prop_string(ctx, -1, "headers");         // [stash res headers]
    duk_enum(ctx, -1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [stash res headers enum]
    while (duk_next(ctx, -1, true)) {                // [stash res headers enum key val]
        MHD_add_response_header(*response, duk_get_string(ctx, -2),
                                duk_require_string(ctx, -1));
        duk_pop_2(ctx);                              // [stash res headers enum]
    }
    return out;
}

/** Validates new ChunkedResponse(), stores it to a duktape stash, and calls
 * MHD_create_response_from_callback(). Returns an http status code. */
static unsigned
processAndQueueChunkedResponse(duk_context *ctx, struct MHD_Response **response) {
    duk_get_prop_string(ctx, -3, "statusCode");   // [stash res Resp ChunkedResp int]
    unsigned out = duk_get_uint(ctx, -1);
    duk_get_prop_string(ctx, -4, "chunkSizeMax"); // [stash res Resp ChunkedResp int int]
    int chunkSizeMax = duk_get_int(ctx, -1);
    if (chunkSizeMax < MIN_CHUNK_LIMIT) chunkSizeMax = MIN_CHUNK_LIMIT;
    duk_pop_n(ctx, 4);                            // [stash res]
    duk_push_boolean(ctx, false);                 // [stash res bool]
    duk_put_prop_string(ctx, -2, KEY_HAD_ERROR);  // [stash res]
    duk_put_prop_string(ctx, -2, KEY_CUR_CHUNK_RESP_OBJ); // [stash]
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
        auto &buf = jsEnvironmentPullAppEnv(ctx, -3)->errBuf;
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

static const char*
getMime(const char *ext) {
    if (strcmp(ext, ".js") == 0) return "application/javascript";
    if (strlen(ext) <= 5 && memcmp(ext, ".htm", 4) == 0) return "text/html";
    if (strcmp(ext, ".css") == 0) return "text/css";
    //
    if (strcmp(ext, ".png") == 0) return "image/png";
    if (strcmp(ext, ".jpg") == 0 || strcmp(ext, ".jpeg") == 0) return "image/jpeg";
    if (strcmp(ext, ".svg") == 0) return "image/svg+xml";
    if (strcmp(ext, ".gif") == 0) return "image/gif";
    if (strlen(ext) <= 5 && memcmp(ext, ".tif", 4) == 0) return "image/tiff";
    if (strcmp(ext, ".bmp") == 0) return "image/bmp";
    //
    if (strcmp(ext, ".woff2") == 0) return "font/woff2";
    if (strcmp(ext, ".woff") == 0) return "font/woff";
    if (strcmp(ext, ".ttf") == 0) return "font/truetype";
    if (strcmp(ext, ".otf") == 0) return "font/opentype";
    //
    return nullptr;
}
