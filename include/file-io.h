#ifndef insn_fileIO_h
#define insn_fileIO_h

#include <sys/stat.h> // fstat
#include <unistd.h> // access
#include "common.h" // stdbool etc.
#include "memory.h"

/**
 * Reads the contents of $filePath. The caller is responsible of freeing the
 * return value.
 */
char*
fileIOReadFile(const char *filePath, char *err);

/**
 * Used by fileIOIs*() macros.
 */
bool
fileIOCheckAccess(const char *path, int mode);

long
fileIOGetFileSize(const char *filePath);

/**
 * Returns true if $path is a writable directory? or file.
 */
#define fileIOIsWritable(path) \
    fileIOCheckAccess(path, W_OK)

#endif