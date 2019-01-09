#pragma once

#include <fstream>

bool
myFsRead(const char *path, std::string &to, std::string &err);
bool
myFsRead(const std::string &path, std::string &to, std::string &err);

/**
 * "c:\foo\bar" -> "c:/foo/bar/".
 */
void
myFsNormalizePath(std::string &path);
