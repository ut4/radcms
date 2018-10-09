#include "../include/website.h"

static unsigned readInt(char *str, unsigned *iptr);

bool
pageGraphParse(char *str, unsigned strLen, PageArray *out) {
    unsigned i = 0;
    unsigned level = 0;
    unsigned totalPageCount = readInt(str, &i);
    pageArrayInit(out, totalPageCount);
    while (i < strLen) {
        // '<' == end of branch
        if (str[i] == '<') {
            level--;
        // page id, consume until 'e'
        } else if (str[i] != 'n') {
            unsigned pageId = readInt(str, &i);
            Page newPage = {.id = pageId, .level = level};
            pageArrayPush(out, &newPage);
            if (str[i] - '0' < 58) { // '0'(48)-'9'(57)
                level++;
            }
            continue;
        }
        i++;
    }
    return true;
}

void
pageGraphSerialize(PageArray *pageGraph, char *to) {

}

static unsigned readInt(char *str, unsigned *iptr) {
    char uintBuf[10]; // strlen("4294967295")
    unsigned bufI = 0;
    unsigned i = *iptr;
    while (str[i] != 'e') {
        uintBuf[bufI] = str[i];
        i++;
        bufI++;
    }
    i++; // consume 'e'
    *iptr = i;
    return (unsigned)atoi(uintBuf);
}

// -- PageArray --
void
pageArrayInit(PageArray *this, unsigned capacity) {
    this->capacity = capacity;
    this->length = 0;
    this->values = ALLOCATE_ARR(Page, capacity);
}
void
pageArrayPush(PageArray *this, Page *page) {
    this->values[this->length] = *page;
    this->length++;
}
void
pageArrayDestruct(PageArray *this) {
    FREE_ARR(Page, this->values, this->length);
    this->values = NULL;
    this->length = 0;
}
