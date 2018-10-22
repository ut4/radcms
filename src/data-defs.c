#include "../include/data-defs.h"

void
componentInit(Component *this) {
    this->id = 0;
    this->name = NULL;
    this->json = NULL;
    this->dataBatchConfigId = 0;
}

void
componentFreeProps(Component *this) {
    if (this->name) {
        FREE_STR(this->name);
        FREE_STR(this->json);
    }
}


void componentArrayInit(ComponentArray *this) {
    this->length = 0;
    this->capacity = 0;
    this->values = NULL;
}
void componentArrayPush(ComponentArray *this, Component *value) {
    if (this->capacity < this->length + 1) {
        unsigned oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, Component,
                                  oldCapacity, this->capacity);
    }
    this->values[this->length] = *value;
    this->length++;
}
void componentArrayFreeProps(ComponentArray *this) {
    for (unsigned i = 0; i < this->length; ++i) componentFreeProps(&this->values[i]);
    FREE_ARR(Component, this->values, this->capacity);
    componentArrayInit(this);
}