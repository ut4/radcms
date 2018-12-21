#ifndef insn_array_h
#define insn_array_h

#define arrayInit(type, initialCapacity) \
    this->length = 0; \
    this->capacity = initialCapacity; \
    this->values = NULL; \
    if (initialCapacity > 0) { \
        this->values = ARRAY_GROW(this->values, type, 0, this->capacity); \
    }

#define arrayFreeProps(type) \
    FREE_ARR(type, this->values, this->capacity); \
    this->length = 0; \
    this->capacity = 0; \
    this->values = NULL

#define arrayPush(type, value) \
    if (this->capacity < this->length + 1) { \
        unsigned oldCapacity = this->capacity; \
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity); \
        this->values = ARRAY_GROW(this->values, type, \
                                  oldCapacity, this->capacity); \
    } \
    this->values[this->length] = value; \
    this->length += 1

#endif