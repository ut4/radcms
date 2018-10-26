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

bool
fileIODeleteFile(const char *filePath, char *err);

bool
fileIOMakeDirs(const char *path, char *err);

/**
 * Used by fileIOIs*() macros.
 */
bool
fileIOCheckAccess(const char *path, int mode);

long
fileIOGetFileSize(const char *filePath);

/**
 * "c:\foo\bar" -> "c:/foo/bar/". The caller frees.
 */
char*
fileIOGetNormalizedPath(const char *path);

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