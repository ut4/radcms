#ifndef insn_websiteHandlersFuncs_h
#define insn_websiteHandlersFuncs_h

#include "../string.h"
#include "../website.h" // Page

#define UPLOAD_OK 0
#define UPLOAD_LOGIN_DENIED 1
#define UPLOAD_UNEXPECTED_ERR 199

typedef struct {
    char *remoteUrl;
    char *username;
    char *password;
} UploadFormData;

struct UploadState;
typedef struct UploadState UploadState;
struct UploadState {
    unsigned nthPage;
    unsigned totalIncomingPages;
    bool hadStopError;
    UploadFormData *formData;
    StrTubeReader *renderOutputReader;
    int (*uploadImplFn)(UploadState *state, char *renderedHtml, Page *page);
    HashMapElPtr *curPage;
    void *curl;
};

typedef struct {
    char *fileContents;
    size_t sizeleft;
} CurlUploadState;

// Note: assumes that the length of ((Page*)cls)->url is never greater than 501
// (the response must fit under 512 chunk and 'NNN\r\n|NNN\r\n' takes the rest.
ssize_t
uploadPageAndWriteRespChunk(void *myPtr, uint64_t pos, char *responseBuf,
                            size_t max);

/**
 * Returns NULL, or comma-separated list of errors.
 */
char*
validateUploadFormData(UploadFormData *data);

#endif