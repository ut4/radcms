#include "../include/memory.h"

void *reallocate(void* previous, size_t oldSize, size_t newSize) {
    if (newSize == 0) {
        free(previous);
        return NULL;
    }
    return realloc(previous, newSize);
}

char *copyString(const char *luaManagedStr) {
    int len = strlen(luaManagedStr);
    char* out = ALLOCATE(char, len + 1);
    memcpy(out, luaManagedStr, len);
    out[len] = '\0';
    return out;
}
