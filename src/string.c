#include "../include/string.h"

StrTube strTubeMake() {
    return (StrTube){.tubeLength = 0, .tubeCapacity = 0, .tube = NULL,
                     .tail = NULL};
}

void strTubeInit(StrTube *this) {
    this->tubeLength = 0;
    this->tubeCapacity = 0;
    this->tube = NULL;
    this->tail = NULL;
}

void strTubeFreeProps(StrTube *this) {
    FREE_ARR(char, this->tube, this->tubeCapacity);
    strTubeInit(this);
}

void strTubePush(StrTube *this, const char *value) {
    #define TO_NEAREST_UPPER 16
    unsigned valLen = strlen(value) + 1;
    unsigned newLen = this->tubeLength + sizeof(unsigned) + valLen;
    if (newLen > this->tubeCapacity) {
        unsigned oldCapacity = this->tubeCapacity;
        // Always round up to the next multiple of TO_NEAREST_UPPER
        this->tubeCapacity = newLen + (TO_NEAREST_UPPER - newLen % TO_NEAREST_UPPER);
        this->tube = ARRAY_GROW(this->tube, char, oldCapacity, this->tubeCapacity);
        this->tail = this->tube + this->tubeLength;
    }
    // Append the length of the value
    unsigned strLen = valLen - 1;
    memcpy(this->tail, &strLen, sizeof(unsigned));
    this->tail += sizeof(unsigned);
    this->tubeLength += sizeof(unsigned);
    // Append the value itself
    memcpy(this->tail, value, valLen);
    this->tail += valLen;
    this->tubeLength += valLen;
    #undef TO_NEAREST_UPPER
}

StrTubeReader strTubeReaderMake(StrTube *strTube) {
    return (StrTubeReader){.strTube = strTube, .cursor = strTube->tube, .pos = 0};
}

char* strTubeReaderNext(StrTubeReader *this) {
    if (this->pos + sizeof(unsigned) < this->strTube->tubeLength) {
        unsigned strLen;
        memcpy(&strLen, this->cursor, sizeof(unsigned));
        this->cursor += sizeof(unsigned);
        //
        char *out = this->cursor;
        this->cursor += strLen + 1;
        this->pos += sizeof(unsigned) + strLen + 1;
        return out;
    }
    return NULL;
}
