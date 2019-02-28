#include "../include/my-fs.hpp"
#include <iostream>

#if defined(INSN_IS_WIN)
static constexpr int DEFAULT_DIR_PERMS = 0;
static int mymkdir(const char *path, unsigned mode) {
    (void)mode;
    return mkdir(path);
}
#elif defined(INSN_IS_LINUX)
static constexpr int DEFAULT_DIR_PERMS = S_IRWXU | (S_IXGRP|S_IRGRP) | (S_IXOTH|S_IROTH); // 755
static int mymkdir(const char *path, unsigned mode) {
    return mkdir(path, mode);
}
#endif

bool
myFsWrite(const char *path, const std::string &contents, std::string &err) {
    std::ofstream ofs(path);
    if (!ofs.is_open()) {
        err.assign("Failed to open file '" + std::string(path) + "'");
        return false;
    }
    ofs << contents;
    ofs.close();
    if (!ofs.bad()) return true;
    err.assign("Failed to close file '" + std::string(path) + "'");
    return false;
}

bool
myFsWrite(const std::string &path, const std::string &contents, std::string &err) {
    return myFsWrite(path.c_str(), contents, err);
}

bool
myFsRead(const char *path, std::string &to, std::string &err) {
    std::ifstream ifs(path);
    if (!ifs.is_open()) {
        err.assign("Failed to open file '" + std::string(path) + "'");
        return false;
    }
    to.assign(
        std::istreambuf_iterator<char>(ifs),
        std::istreambuf_iterator<char>()
    );
    ifs.close();
    if (!ifs.bad()) return true;
    err.assign("Failed to close file '" + std::string(path) + "'");
    return false;
}

bool
myFsRead(const std::string &path, std::string &to, std::string &err) {
    return myFsRead(path.c_str(), to, err);
}

bool
myFsMakeDirs(const char *path, std::string &err) {
    const unsigned plen = strlen(path);
    if (plen > PATH_MAX) {
        err = "Path too long";
        return false;
    }
    char ref[PATH_MAX];
    memcpy(ref, path, plen);
    ref[ref[plen - 1] != '/' ? plen : plen - 1] = '\0';
    bool isReadable = myFsIsReadable(ref);
    if (isReadable) return true;
    //
    constexpr int maxNewDirs = 16;
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
            err = "Too many directories " + std::to_string(numNewDirs) + " > " +
                    std::to_string(maxNewDirs);
            return false;
        }
        isReadable = myFsIsReadable(ref);
    }
    if (numNewDirs == 0) {
        err = "numNewDirs == 0";
        return false;
    }
    // levels = [5, 3]
    // 1. round: undo 3 'a/b\0c\0d' -> 'a/b/c\0d'
    // 2. round: undo 5 'a/b/c\0d' -> 'a/b/c/d'
    for (int i = numNewDirs - 1; i >= 0; --i) {
        ref[levels[i]] = '/'; // unstub
        if (mymkdir(ref, DEFAULT_DIR_PERMS) != 0) {
            err = "Failed to create directory '" + std::string(ref) + "'";
            return false;
        }
    }
    return true;
}

bool
myFsReadDir(const char *path, bool (*onEach)(const char *fileName, void *myPtr),
            void *myPtr, std::string &err) {
    DIR *dir = opendir(path);
    if (!dir) {
        err.assign("Failed to open dir '" + std::string(path) + "'");
        return false;
    }
    struct dirent *ent = nullptr;
    bool out = true;
    while ((ent = readdir(dir))) {
        if (!(out = onEach(ent->d_name, myPtr))) break;
    }
    closedir(dir);
    return out;
}

void
myFsNormalizePath(std::string &path) {
    int l = path.size();
    if (l == 0) return;
    if (path[l - 1] != '/') { path += '/'; l += 1; }
    //
    for (int i = 0; i < l; ++i) {
        if (path[i] == '\\') path[i] = '/';
    }
}
