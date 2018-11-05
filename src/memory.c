#include "../include/memory.h"

#ifdef DEBUG_COUNT_ALLOC
static size_t bytesAllocated = 0;
#endif

void* reallocate(void* previous, size_t oldSize, size_t newSize) {
#ifdef DEBUG_COUNT_ALLOC
    bytesAllocated += newSize - oldSize; // note: >0 on ALLOCATE, <0 on FREE
#endif
    if (newSize == 0) {
        free(previous);
        return NULL;
    }
    return realloc(previous, newSize);
}

char *copyString(const char *str) {
#ifdef DEBUG_COUNT_ALLOC
    bytesAllocated += strlen(str) + 1;
#endif
    return strdup(str);
}

void
printMemoryReport() {
#ifdef DEBUG_COUNT_ALLOC
    printf("Program exited, unfreed bytes: %ld.\n", bytesAllocated);
#endif
}

#ifdef DEBUG_COUNT_ALLOC
void
memoryAddToByteCount(int amount) {
    bytesAllocated += amount;
}
#endif