#include "../include/file-io.h"
#include <stdio.h>

bool
fileIOCheckAccess(const char *path, int mode) {
    return access(path, mode) == 0;
}
