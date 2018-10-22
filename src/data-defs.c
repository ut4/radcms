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
