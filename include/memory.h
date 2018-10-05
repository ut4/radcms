#ifndef rad3_memory_h
#define rad3_memory_h

#include <stdlib.h> // free, realloc
#include <string.h> // memcpy
#include <stddef.h> // size_t

void *reallocate(void *previous, size_t oldSize, size_t newSize);
char *copyString(const char *luaManagedString);

#define ALLOCATE(type, howMany) \
    (type*)reallocate(NULL, 0, sizeof(type) * (howMany))

#define FREE(pointer) \
    reallocate(pointer, 0, 0)

#define ARRAY_INCREASE_CAPACITY(capacity) \
    ((capacity) < 8 ? 8 : (capacity) * 2)

#define ARRAY_GROW(previous, type, oldCount, count) \
    (type*)reallocate(previous, sizeof(type) * (oldCount), \
        sizeof(type) * (count))

#define ARRAY_FREE(type, pointer, oldCount) \
    reallocate(pointer, sizeof(type) * (oldCount), 0)

#endif
