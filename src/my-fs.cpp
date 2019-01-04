#include "../include/my-fs.hpp"

bool
myFsRead(const std::string &path, std::string &to, std::string &err) {
    std::ifstream ifs(path);
    if (!ifs.is_open()) {
        err.assign("Failed to open file '" + path + "'");
        return false;
    }
    to.assign(
        std::istreambuf_iterator<char>(ifs),
        std::istreambuf_iterator<char>()
    );
    ifs.close();
    return !ifs.bad();
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
