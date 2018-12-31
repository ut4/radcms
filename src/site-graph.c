#include <errno.h>
#include <limits.h>
#include "../include/site-graph.h"
#include "../include/common/memory.h" // ALLOCATE, strtol(stdlib.h), memcpy(string.h), bool

static long int strReaderReadInt(StrReader *this);
static char* strReaderReadStr(StrReader *this);
static char strReaderAdvance(StrReader *this);
static void pageFreeProps(Page *this);
static void templateArrayInit(TemplateArray *this);
static void templateArrayPush(TemplateArray *this, Template value);
static void templateArrayFreeProps(TemplateArray *this);

void
siteGraphInit(SiteGraph *this) {
    hashmap_init(&this->pages);
    templateArrayInit(&this->templates);
}

void
siteGraphFreeProps(SiteGraph *this) {
    HashMapElPtr *ptr = this->pages.orderedAccess;
    while (ptr) {
        pageFreeProps(ptr->data);
        FREE(Page, ptr->data);
        ptr = ptr->next;
    }
    hashmap_free_props(&this->pages);
    templateArrayFreeProps(&this->templates);
}

bool
siteGraphParse(char *str, SiteGraph *out, StrReader *sr, char *err) {
    #define MAX_PAGES 4000000
    #define MAX_TEMPLATES 1000
    #define MAX_ID 2147483647
    #define putErrorAndReturn(error) putError("Sitegraph: %s", error); return false
    if (!strlen(str)) {
        putErrorAndReturn("Expected pageCount at the beginning");
    }
    sr->current = str;
    sr->END_OF_VAL = '|';
    /*
     * Header: `<pageCount>|<templateCount>|`
     */
    long int totalPageCount = strReaderReadInt(sr);
    if (totalPageCount < 1 || totalPageCount > MAX_PAGES) {
        putErrorAndReturn("Expected pageCount at the beginning");
    }
    long int templateCount = strReaderReadInt(sr);
    if (templateCount < 1 || templateCount > MAX_TEMPLATES) {
        putErrorAndReturn("Expected template count after pageCount");
    }
    /*
     * Pages: `<id>|<url>|<parentId>|<layoutIdx>|`...
     */
    while (out->pages.size < totalPageCount) {
        long int id = strReaderReadInt(sr);
        if (id < 1 || id > MAX_ID) {
            putErrorAndReturn("Expected pageId");
        }
        char *url = strReaderReadStr(sr);
        if (!url) {
            putErrorAndReturn("Expected url after pageId");
        }
        long int parentId = strReaderReadInt(sr);
        if (parentId < 0 || id > MAX_ID) {
            putErrorAndReturn("Expected parentId after url");
        }
        long int layoutIdx = strReaderReadInt(sr);
        if (layoutIdx < 0 || id > (MAX_TEMPLATES - 1)) {
            putErrorAndReturn("Expected layoutIdx after parentId");
        }
        (void)siteGraphAddPage(out, id, url, parentId, layoutIdx);
    }
    if (out->pages.size < totalPageCount) {
        putErrorAndReturn("Expected pageId");
    }
    /*
     * Template names: `<name>|`...
     */
    while (out->templates.length < templateCount) {
        char *templateName = strReaderReadStr(sr);
        if (!templateName) {
            putErrorAndReturn("Expected template name");
        }
        Template *t = siteGraphAddTemplate(out, templateName);
        unsigned tIdx = out->templates.length - 1;
        HashMapElPtr *ptr = out->pages.orderedAccess;
        while (ptr) {
            if (((Page*)ptr->data)->layoutIdx == tIdx) {
                t->sampleUrl = ((Page*)ptr->data)->url;
                break;
            }
            ptr = ptr->next;
        }
    }
    if (out->templates.length < templateCount) {
        putErrorAndReturn("Expected template name");
    }
    return true;
    #undef MAX_PAGES
    #undef MAX_TEMPLATES
    #undef MAX_ID
    #undef putErrorAndReturn
}

char*
siteGraphSerialize(SiteGraph *this) {
    #define intStrLen(int) (unsigned)(log10(int) + 1)
    /*
     * Calculate the length
     */
    unsigned len = (this->pages.size > 0 ? intStrLen(this->pages.size) : 1) +
                   (this->templates.length > 0 ? intStrLen(this->templates.length) : 1) +
                   2 + // '|' * 2
                   1;  // '\0
    HashMapElPtr *ptr = this->pages.orderedAccess;
    while (ptr) {
        Page *page = ptr->data;
        len += intStrLen(page->id) +
               strlen(page->url) +
               (page->parentId > 0 ? intStrLen(page->parentId) : 1) +
               (page->layoutIdx > 0 ? intStrLen(page->layoutIdx) : 1) +
               3; // '|' * 3
        ptr = ptr->next;
    }
    for (unsigned i = 0; i < this->templates.length; ++i) {
        len += strlen(this->templates.values[i].fileName) +
               1; // '|'
    }
    /*
     * Build the string
     */
    char *out = ALLOCATE_ARR(char, len);
    if (!out) {
        printToStdErr("[Error]: siteGraphSerialize: Failed to allocate $out.\n");
        return NULL;
    }
    char *tail = out;
    tail += snprintf(tail, len, "%u|%u|", this->pages.size, this->templates.length);
    ptr = this->pages.orderedAccess;
    while (ptr) {
        Page *page = ptr->data;
        tail += snprintf(tail, len, "%u%s|%u|%u|", page->id, page->url,
                         page->parentId, page->layoutIdx);
        ptr = ptr->next;
    }
    for (unsigned i = 0; i < this->templates.length; ++i) {
        tail += snprintf(tail, len, "%s|", this->templates.values[i].fileName);
    }
    return out;
    #undef intStrLen
}

Page*
siteGraphFindPage(SiteGraph *this, char *url) {
    void *page;
    hashmap_get(&this->pages, url, &page);
    return page;
}

Page*
siteGraphAddPage(SiteGraph *this, unsigned id, char *url, unsigned parentId,
                 int layoutIdx) {
    Page *newPage = ALLOCATE(Page);
    newPage->id = id;
    newPage->url = url;
    newPage->parentId = parentId;
    newPage->layoutIdx = layoutIdx;
    hashmap_put(&this->pages, url, newPage);
    return newPage;
}

Template*
siteGraphFindTemplate(SiteGraph *this, char *fileName, int *idxOut) {
    for (unsigned i = 0; i < this->templates.length; ++i) {
        if (strcmp(this->templates.values[i].fileName, fileName) == 0) {
            *idxOut = i;
            return &this->templates.values[i];
        }
    }
    return NULL;
}

Template*
siteGraphGetTemplate(SiteGraph *this, int idx) {
    return idx > -1 && idx < this->templates.length ? &this->templates.values[idx] : NULL;
}

Template*
siteGraphAddTemplate(SiteGraph *this, char *fileName) {
    templateArrayPush(&this->templates, (Template){
        .fileName = fileName,
        .sampleUrl = NULL,
        .exists = true
    });
    return &this->templates.values[this->templates.length - 1];
}

static long int
strReaderReadInt(StrReader *this) {
    char *end;
    if (*this->current == '\0') return LONG_MIN;
    long int res = strtol(this->current, &end, 10);
    if (errno != ERANGE) {
        this->current = end;
        if (*this->current == this->END_OF_VAL) (void)strReaderAdvance(this);
    } // else res == LONG_MIN or LONG_MAX
    return res;
}

static char*
strReaderReadStr(StrReader *this) {
    char *start = this->current;
    char c = *this->current;
    while (c != this->END_OF_VAL && c != '\0') {
        (void)strReaderAdvance(this);
        c = *this->current;
    }
    int len = (int)(this->current - start); // not including space for \0
    if (len <= 0) return NULL;
    char *out = ALLOCATE_ARR(char, len + 1);
    memcpy(out, start, len);
    out[len] = '\0';
    if (*this->current == this->END_OF_VAL) (void)strReaderAdvance(this);
    return out;
}

static char
strReaderAdvance(StrReader *this) {
    this->current += 1;
    return this->current[-1];
}

static void
pageFreeProps(Page *this) {
    FREE_STR(this->url);
}

static void templateArrayInit(TemplateArray *this) {
    arrayInit(Template, 0);
}
static void templateArrayPush(TemplateArray *this, Template value) {
    arrayPush(Template, value);
}
static void templateArrayFreeProps(TemplateArray *this) {
    for (unsigned i = 0; i < this->length; ++i) {
        FREE_STR(this->values[i].fileName);
    }
    arrayFreeProps(Template);
}
