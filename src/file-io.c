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
fileIODeleteFile(const char *filePath, char *err) {
    if (remove(filePath) != 0) {
        putError("Failed to delete file '%s'.\n", filePath);
    }
    return true;
}

bool
fileIOMakeDirs(const char *path, char *err) {
    size_t l = strlen(path) + 1;
    if (l > PATH_MAX) {
        putError("Directory path '%s' too long.\n", path);
        return false;
    }
    char ref[l];
    strcpy(ref, path);
    if (ref[l - 2] == '/') ref[l - 2] = '\0';
    bool isReadable = fileIOIsReadable(ref);
    if (isReadable) {
        return true;
    }
    #define maxNewDirs 16
    unsigned levels[maxNewDirs];
    unsigned numNewDirs = 0;
    // Find the first directory that doesn't exist, starting at the end.
    // 1. round: dirExist('a/b/c/d') false -> 'a/b/c\0d'
    // 2. round: dirExist('a/b/c') false -> 'a/b\0c\0d'
    // 3. round: dirExist('a/b') true
    while (!isReadable) {
        char *slash = strrchr(ref, '/');
        if (!slash) break;
        levels[numNewDirs] = (unsigned)(slash - ref);
        ref[levels[numNewDirs]] = '\0'; // stub
        if (++numNewDirs > maxNewDirs) {
            putError("Too many directories %u > %u", numNewDirs, maxNewDirs);
            return false;
        }
        isReadable = fileIOIsReadable(ref);
    }
    if (numNewDirs == 0) {
        putError("numNewDirs == 0\n");
        return false;
    }
    // levels = [5, 3]
    // 1. round: undo 3 'a/b\0c\0d' -> 'a/b/c\0d'
    // 2. round: undo 5 'a/b/c\0d' -> 'a/b/c/d'
    for (unsigned i = numNewDirs - 1; i >= 0; --i) {
        ref[levels[i]] = '/'; // unstub
        if (mkdir(ref) != 0) {
            putError("Failed to create directory '%s'", ref);
            return false;
        }
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

char*
fileIOGetNormalizedPath(const char *path) {
    size_t l = strlen(path);
    char *out;
    if (path[l - 1] != '/') {
        out = ALLOCATE_ARR(char, l + 2);
        snprintf(out, l + 2, "%s%c", path, '/');
    } else {
        out = copyString(path);
    }
    unsigned l2 = strlen(out);
    for (unsigned i = 0; i < l2; ++i) {
        if (out[i] == '\\') out[i] = '/';
    }
    return out;
}
