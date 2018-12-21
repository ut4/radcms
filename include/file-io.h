#ifndef insn_fileIO_h
#define insn_fileIO_h

#if defined(INSN_IS_WIN)
#include <limits.h> // PATH_MAX
#elif defined(INSN_IS_LINUX)
#include <linux/limits.h> // PATH_MAX
#endif
#include <sys/stat.h> // fstat
#include <unistd.h> // access
#include "common/common.h" // stdbool etc.
#include "common/memory.h"

int mkdirp(const char *path, unsigned mode);

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