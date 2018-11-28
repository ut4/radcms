#include "../include/data-defs.h"

void
componentInit(Component *this) {
    this->id = 0;
    this->name = NULL;
    this->json = NULL;
    this->componentTypeId = 0;
    this->dataBatchConfigId = 0;
}

void
componentFreeProps(Component *this) {
    if (this->name) FREE_STR(this->name);
    if (this->json) FREE_STR(this->json);
}

// @unused
char*
componentArrayToJson(ComponentArray *this) {
    cJSON *json = cJSON_CreateArray();
    char *out = NULL;
    if (!json) goto done;
    for (unsigned i = 0; i < this->length; ++i) {
        Component *cmp = &this->values[i];
        cJSON *obj = cJSON_CreateObject();
        if (!obj ||
            !cJSON_AddNumberToObject(obj, "id", cmp->id) ||
            !cJSON_AddStringToObject(obj, "name", cmp->name) ||
            !cJSON_AddStringToObject(obj, "json", cmp->json) ||
            !cJSON_AddNumberToObject(obj, "componentTypeId",
                                     cmp->componentTypeId) ||
            !cJSON_AddNumberToObject(obj, "dataBatchConfigId",
                                     cmp->dataBatchConfigId)) {
            goto done;
        }
        cJSON_AddItemToArray(json, obj);
    }
    out = cJSON_PrintUnformatted(json);
    done:
        cJSON_Delete(json);
        return out;
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