#pragma once

#include <fstream>
#include <cstring>
#include <dirent.h> // opendir()
#include <sys/stat.h> // mkdir(), S_IRWXU etc., fstat()
#include <fcntl.h> // O_RDONLY
#if defined(INSN_IS_WIN)
#include <limits.h> // PATH_MAX
#elif defined(INSN_IS_LINUX)
#include <unistd.h> // access()
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
myFsReadDir(const char *path,
            bool (*onEach)(const char *entryName, bool isDir, void *myPtr),
            void *myPtr, std::string &err);

bool
myFsMakeDirs(const char *path, std::string &err);

int
myFsGetFileInfo(const char *path, struct stat *out);

#define myFsIsReadable(path) \
    (access(path, R_OK) == 0)

bool
myFsIsDir(const char *path);

/**
 * "c:\foo\bar" -> "c:/foo/bar/".
 */
void
myFsNormalizePath(std::string &path);
