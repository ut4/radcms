#include "../include/website.h"

#define END_OF_VAL '|'

static unsigned readInt();
static char* readUrl();
static bool isDigit(char c);
static char advance();

static char *current;

bool
siteGraphParse(char *str, PageArray *out, char *err) {
    if (!isDigit(str[0])) {
        putError("ParseError: Expected a digit but got '%c'", str[0]);
        return false;
    }
    current = str;
    unsigned totalPageCount = readInt();
    pageArrayInit(out, totalPageCount);
    while (*current != '\0') {
        if (isDigit(*current)) {
            Page newPage = {
                .id = readInt(),
                .url = readUrl(),
                .parentId = readInt()
            };
            pageArrayPush(out, &newPage);
            continue;
        } else {
            putError("Unpexted character '%c'", *current);
            return false;
        }
    }
    return true;
}

void
siteGraphSerialize(PageArray *siteGraph, char *to) {

}

static unsigned
readInt() {
    char uintBuf[10]; // strlen("4294967295")
    unsigned n = 0;
    while (isDigit(*current)) {
        uintBuf[n] = advance();
        n++;
    }
    if (*current == END_OF_VAL) (void)advance();
    return (unsigned)atoi(uintBuf);
}

static char*
readUrl() {
    char *start = current;
    char c = *current;
    while (
        (c >= '-' && c <= '9') || // - someweirdcharacter / and 0-9
        (c >= 'A' && c <= 'Z') ||
        (c >= 'a' && c <= 'z') ||
        c == '_'
    ) {
        (void)advance();
        c = *current;
    }
    int urlLen = (int)(current - start); // not including space for \0
    char *out = ALLOCATE_ARR(char, urlLen + 1);
    memcpy(out, start, urlLen);
    out[urlLen] = '\0';
    if (c == END_OF_VAL) (void)advance();
    return out;
}

static bool isDigit(char c) {
    return c >= '0' && c <= '9';
}

static char advance() {
    current++;
    return current[-1];
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
    for (unsigned i = 0; i < this->capacity; ++i) FREE_STR(this->values[i].url);
    FREE_ARR(Page, this->values, this->capacity);
    this->values = NULL;
    this->length = 0;
}
