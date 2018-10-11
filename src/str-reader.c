#include "../include/str-reader.h"

void
strReaderInit(StrReader *this, char *strToRead, char END_OF_VAL) {
    this->current = strToRead;
    this->END_OF_VAL = END_OF_VAL;
}

unsigned
strReaderReadInt(StrReader *this) {
    char uintBuf[10]; // strlen("4294967295")
    unsigned n = 0;
    while (strReaderIsDigit(*this->current)) {
        uintBuf[n] = strReaderAdvance(this);
        n++;
    }
    if (*this->current == this->END_OF_VAL) (void)strReaderAdvance(this);
    return (unsigned)atoi(uintBuf);
}

char*
strReaderReadStr(StrReader *this) {
    char *start = this->current;
    char c = *this->current;
    while (c != this->END_OF_VAL && c != '\0') {
        (void)strReaderAdvance(this);
        c = *this->current;
    }
    int strLen = (int)(this->current - start); // not including space for \0
    char *out = ALLOCATE_ARR(char, strLen + 1);
    memcpy(out, start, strLen);
    out[strLen] = '\0';
    if (*this->current == this->END_OF_VAL) (void)strReaderAdvance(this);
    return out;
}

bool
strReaderIsDigit(char c) {
    return c >= '0' && c <= '9';
}

char
strReaderAdvance(StrReader *this) {
    this->current++;
    return this->current[-1];
}
