#include "../../include/web/website-handlers-funcs.h"

ssize_t
uploadPageAndWriteRespChunk(void *myPtr, uint64_t pos, char *responseBuf,
                            size_t max) {
    UploadState *state = myPtr;
    char *renderedHtml = NULL;
    if (state->nthPage > state->totalIncomingPages) {
        return -1;
    }
    if (!state->hadStopError) {
        int uploadResult = UPLOAD_OK;
        Page *p = state->curPage->data;
        //
        if ((renderedHtml = strTubeReaderNext(state->renderOutputReader))) {
            uploadResult = state->uploadImplFn(state, renderedHtml, p);
            if (uploadResult == UPLOAD_LOGIN_DENIED) {
                state->hadStopError = true;
            }
        } else {
            uploadResult = UPLOAD_UNEXPECTED_ERR;
            state->hadStopError = true;
        }
        //
        sprintf(responseBuf, "%x\r\n%s|%03d\r\n",
                (int)strlen(p->url) + 1 + 3, // 1 == '|', 3 == uint8
                p->url, uploadResult);
        state->nthPage += 1;
        state->curPage = state->curPage->next;
        return strlen(responseBuf);
    }
    // hadStopError
    return -2;
}

char*
validateUploadFormData(UploadFormData *data) {
    const char *rUrlRequiredError = "FPS remote url is required,";
    const char *uNameRequiredError = "Username is required,";
    const char *passRequiredError = "Password is required";
    const unsigned aLen = !data->remoteUrl ? strlen(rUrlRequiredError) : 0;
    const unsigned bLen = !data->username ? strlen(uNameRequiredError) : 0;
    const unsigned cLen = !data->password ? strlen(passRequiredError) : 0;
    const unsigned len = aLen + bLen + cLen + 1;
    // Had at least one error
    if (len > 1)  {
        char *message = ALLOCATE_ARR_NO_COUNT(char, len); // freed by microhttpd
        char *tail = message;
        if (aLen > 0) STR_APPEND(tail, rUrlRequiredError, aLen);
        if (bLen > 0) STR_APPEND(tail, uNameRequiredError, bLen);
        if (cLen > 0) STR_APPEND(tail, passRequiredError, cLen);
        *tail = '\0';
        return message;
    }
    // No errors, normalize and return
    if (aLen == 0) {
        const unsigned last = strlen(data->remoteUrl) - 1;
        if (data->remoteUrl[last] != '/') {
            data->remoteUrl = ARRAY_GROW(data->remoteUrl, char, last + 2, last + 3);
            memcpy(&data->remoteUrl[last + 1], "/", 2);
        }
    }
    return NULL;
}
