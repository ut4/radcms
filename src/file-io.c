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
fileIOWriteFile(const char *filePath, const char *data, char *err) {
    FILE *f = fopen(filePath, "w");
    if (!f) {
        putError("Failed to open '%s' for writing.\n", filePath);
        return false;
    }
    fputs(data, f);
    if (ferror(f)) {
        putError("Failed to write the data to '%s'.\n", filePath);
    }
    fclose(f);
    return true;
}

bool
fileIOMakeDirs(const char *path, unsigned ignoreNChars, const char *rootPath,
               char *err) {
    if (ignoreNChars < strlen(rootPath)) {
        putError("ignoreNChars %u < strlen(rootPath) %d.\n", ignoreNChars,
                 strlen(rootPath));
        return false;
    }
    const size_t pathLen = strlen(path);
    const bool hasTrailingSlash = path[pathLen - 1] == '/';
    const size_t adjustedPathArrLen = pathLen + !hasTrailingSlash + 1;
    if (adjustedPathArrLen > PATH_MAX) {
        putError("Directory path '%s' too long.\n", path);
        return false;
    }
    char ref[adjustedPathArrLen];
    strcpy(ref, path);
    if (!hasTrailingSlash) strcat(ref, "/");
    //
    char *head = ref + ignoreNChars;
    char *slash;
    while ((slash = strstr(head, "/")) != NULL && slash != head) {
        unsigned pos = (unsigned)(slash - ref);
        ref[pos] = '\0'; // Truncate at nth slash (1st round foo/bar/baz/ -> foo\0,
                         //                        2st round foo/bar/baz/ -> foo/bar\0
                         //                        3st round foo/bar/baz/ -> foo/bar/baz\0
                         //                        done
        if (!fileIOIsReadable(ref)) { // skip if already exists
            if (mkdir(ref) != 0) {
                putError("Failed to create directory '%s'", ref);
                return false;
            }
        }
        ref[pos] = '/'; // undo truncation
        head = slash + 1;
    }
    return true;
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
