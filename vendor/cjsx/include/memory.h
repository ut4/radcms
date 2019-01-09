#ifndef insn_memory_h
#define insn_memory_h

#include <stdlib.h> // realloc, free

#define ALLOCATE_ARR(type, count) \
    (type*)reallocate(NULL, 0, sizeof(type) * (count))

#define FREE_ARR(type, pointer, count) \
    reallocate(pointer, sizeof(type) * (count), 0)

#define ARRAY_GROW(previous, type, oldCount, count) \
    (type*)reallocate(previous, sizeof(type) * oldCount, sizeof(type) * count)

void*
reallocate(void* previous, size_t oldSize, size_t newSize);

#endif