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
