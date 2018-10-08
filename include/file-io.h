#ifndef insn_fileIO_h
#define insn_fileIO_h

#include <unistd.h> // access
#include "common.h" // stdbool etc.

/**
 * Used by fileIOIs*() macros.
 */
bool
fileIOCheckAccess(const char *path, int mode);

/**
 * Returns true if $path is a writable directory? or file.
 */
#define fileIOIsWritable(path) \
    fileIOCheckAccess(path, W_OK)

#endif