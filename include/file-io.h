#ifndef insn_fileIO_h
#define insn_fileIO_h

#include <limits.h> // PATH_MAX
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
 * Writes $data to $filePath.
 */
bool
fileIOWriteFile(const char *filePath, const char *data, char *err);

/**
 * Example: makeDir("c:/root/bar/baz/", strlen("c:/root/"), "c:/root/", errBuf)
 * creates 'c:/root/bar' and 'c:/root/bar/baz' -directories.
 */
bool
fileIOMakeDirs(const char *path, unsigned ignoreNChars, const char *rootPath,
               char *err);

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

/**
 * Returns true if $path is a readable directory? or file.
 */
#define fileIOIsReadable(path) \
    fileIOCheckAccess(path, R_OK)

#endif