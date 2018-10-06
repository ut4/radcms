#include "../include/web-common.h"

void
readFileAndMakeRes(struct MHD_Response** response, const char *rootDir,
                   const char *tmplFileName) {
    char tmplFilePath[strlen(rootDir) + strlen(tmplFileName) + 1];
    sprintf(tmplFilePath, "%s%s", rootDir, tmplFileName);
    int fhandle = open(tmplFilePath, O_RDONLY);
    struct stat sizeInfo;
    if (fhandle == -1 || fstat(fhandle, &sizeInfo) != 0) {
        if (fhandle != -1) close(fhandle);
        return;
    }
    *response = MHD_create_response_from_fd_at_offset64(sizeInfo.st_size, fhandle, 0);
    MHD_add_response_header(*response, "Content-Type", "text/html");
}
