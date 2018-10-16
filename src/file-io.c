#include "../include/file-io.h"
#include <stdio.h>

#define MAX_FILE_SIZE 2000000 // 2MB

char*
fileIOReadFile(const char *filePath, char *err) {
    size_t s = (size_t)fileIOGetFileSize(filePath);
    FILE *f;
    if (s <= 0 || !(f = fopen(filePath, "rb"))) { // b == no need to handle crlf/lf
        putError("Failed to open '%s'.\n", filePath);
        return false;
    }
    if (s + 1 > MAX_FILE_SIZE) {
        putError("Max size for a file is %dMB.\n", (int)(MAX_FILE_SIZE / 1000000));
        return false;
    }
    char *out = ALLOCATE_ARR(char, s + 1);
    if (!out) {
        putError("Failed to allocate memory for '%s'.\n", filePath);
        return false;
    }
    (void)fread(out, 1, s, f);
    out[s] = '\0';
    if (s != ftell(f)) {
        putError("Failed to read the contents of '%s'.\n", filePath);
        FREE_ARR(char, out, s + 1);
        return false;
    }
    fclose(f);
    return out;
}

bool
fileIOCheckAccess(const char *path, int mode) {
    return access(path, mode) == 0;
}

long
fileIOGetFileSize(const char *filePath) {
    struct stat fileInfo;
    if (stat(filePath, &fileInfo) == 0) {
        return fileInfo.st_size;
    }
    return -1;
}
