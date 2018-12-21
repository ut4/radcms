#ifndef insn_memory_h
#define insn_memory_h

#define DEBUG_COUNT_ALLOC // comment out to disable memory counting
#include <stdlib.h> // realloc, free
#include <string.h> // strdup
#include "common.h"

#define ALLOCATE(type) \
    reallocate(NULL, 0, sizeof(type))

#define ALLOCATE_ARR(type, count) \
    reallocate(NULL, 0, sizeof(type) * count)

#ifndef DEBUG_COUNT_ALLOC
#define ALLOCATE_ARR_NO_COUNT(type, size) \
    ALLOCATE_ARR(type, size)
#else
#define ALLOCATE_ARR_NO_COUNT(type, count) \
    realloc(NULL, sizeof(type) * count)
#endif

#define FREE(type, pointer) \
    reallocate(pointer, sizeof(type), 0)

#define FREE_ARR(type, pointer, count) \
    reallocate(pointer, sizeof(type) * count, 0)

#define FREE_STR(nullTerminatedStr) \
    reallocate(nullTerminatedStr, strlen(nullTerminatedStr) + 1, 0)

#define STR_CONCAT(toVarName, a, b) \
    size_t l = strlen(a) + strlen(b) + 1; \
    ASSERT(l <= 2048, "strlen(strConcatResult) %lu > 2048", l); \
    char toVarName[l]; \
    snprintf(toVarName, l, "%s%s", a, b)

#define ARRAY_GROW(previous, type, oldCount, count) \
    reallocate(previous, sizeof(type) * oldCount, sizeof(type) * count)

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

#ifdef DEBUG_COUNT_ALLOC
void
memoryAddToByteCount(int amount);
#endif

#endif