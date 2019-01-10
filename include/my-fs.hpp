#pragma once

#include <fstream>
#include <cstring>
#include <sys/stat.h> // mkdir, S_IRWXU etc.
#if defined(INSN_IS_WIN)
#include <limits.h> // PATH_MAX
#elif defined(INSN_IS_LINUX)
#include <linux/limits.h> // PATH_MAX
#endif

bool
myFsWrite(const char *path, const std::string &contents, std::string &err);
bool
myFsWrite(const std::string &path, const std::string &contents, std::string &err);

bool
myFsRead(const char *path, std::string &to, std::string &err);
bool
myFsRead(const std::string &path, std::string &to, std::string &err);

bool
myFsMakeDirs(const char *path, std::string &err);

#define myFsIsReadable(path) \
    access(path, R_OK) == 0

/**
 * "c:\foo\bar" -> "c:/foo/bar/".
 */
void
myFsNormalizePath(std::string &path);
