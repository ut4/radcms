#include "../include/my-fs.hpp"

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
    return !ifs.bad();
}

bool
myFsRead(const std::string &path, std::string &to, std::string &err) {
    return myFsRead(path.c_str(), to, err);
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
