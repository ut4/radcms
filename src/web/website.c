#include "../../include/web/website.h"

#define END_OF_VAL '|'

static unsigned readInt(); // TODO move to ParseUtils..
static char* readUrl();
static bool isDigit(char c);
static char advance();

static char *current;

bool
webSiteInit(Website *this, char *err) {
    const char *serialized = "5|24/|0|5/foo|0|8/f/b|5|6/b/z|8|2/baz|0";
    return siteGraphParse((char*)serialized, &this->siteGraph, err);
}

void
websiteDestruct(Website *this) {
    pageArrayDestruct(&this->siteGraph);
}

unsigned
websiteHandlersHandlePageRequest(void *this, const char *method, const char *url,
                                 struct MHD_Response **response) {
    Page *p = siteGraphFindPage(&((Website*)this)->siteGraph, url);
    if (!p) {
        return MHD_HTTP_NOT_FOUND;
    }
    *response = MHD_create_response_from_buffer(strlen(p->url), (void*)p->url,
                                                MHD_RESPMEM_PERSISTENT);
    return MHD_HTTP_OK;
}

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

Page*
siteGraphFindPage(PageArray *siteGraph, const char *url) {
    for (unsigned i = 0; i < siteGraph->length; ++i) {
        if (strcmp(siteGraph->values[i].url, url) == 0) {
            return &siteGraph->values[i];
        }
    }
    return NULL;
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
