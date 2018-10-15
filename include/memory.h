#ifndef insn_memory_h
#define insn_memory_h

#define DEBUG_COUNT_ALLOC // comment to disable memory counting
#include <stdlib.h> // realloc, free
#include <string.h> // strdup
#include "common.h"

#define ALLOCATE(type) \
    (type*)reallocate(NULL, 0, sizeof(type))

#define ALLOCATE_ARR(type, count) \
    (type*)reallocate(NULL, 0, sizeof(type) * (count))

#define FREE(type, pointer) \
    reallocate(pointer, sizeof(type), 0)

#define FREE_ARR(type, pointer, count) \
    reallocate(pointer, sizeof(type) * (count), 0)

#define FREE_STR(nullTerminatedStr) \
    reallocate(nullTerminatedStr, strlen(nullTerminatedStr) + 1, 0)

#define STR_CONCAT(toVarName, a, b) \
    size_t l = strlen(a) + strlen(b) + 1; \
    char toVarName[l]; \
    snprintf(toVarName, l, "%s%s", a, b)

#define ARRAY_GROW(previous, type, oldCount, count) \
    (type*)reallocate(previous, sizeof(type) * oldCount, sizeof(type) * count)

#define ARRAY_INCREASE_CAPACITY(capacity) \
    (capacity < 8 ? 8 : capacity * 2)

/**
 * Because valgrind is linux-only and App Verifier (or i am) is shit.
 */
void*
reallocate(void* previous, size_t oldSize, size_t newSize);

/**
 * Returns a copy of $str. The caller is responsible of freeing the return value.
 */
char*
copyString(const char *str);

/**
 * Prints the number of bytes that's still in use, or does nothing if
 * DEBUG_COUNT_ALLOC is not defined.
 */
void
printMemoryReport();

#endif