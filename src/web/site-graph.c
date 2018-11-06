#include "../../include/web/site-graph.h"

void
siteGraphInit(SiteGraph *this) {
    this->pages.capacity = 0;
    this->pages.length = 0;
    this->pages.values = NULL;
    this->tmplFiles.capacity = 0;
    this->tmplFiles.length = 0;
    this->tmplFiles.values = NULL;
}

void
siteGraphFreeProps(SiteGraph *this) {
    if (this->pages.values) pageArrayFreeProps(&this->pages);
    if (this->tmplFiles.values) textNodeArrayFreeProps(&this->tmplFiles);
}

bool
siteGraphParse(char *str, SiteGraph *out, StrReader *sr, char *err) {
    if (!strReaderIsDigit(str[0])) {
        putError("ParseError: Expected a digit but got '%c'.\n", str[0]);
        return false;
    }
    strReaderInit(sr, str, '|');
    unsigned totalPageCount = strReaderReadInt(sr);
    pageArrayInit(&out->pages, totalPageCount);
    unsigned templateCount = strReaderReadInt(sr);
    if (templateCount == 0) return false;
    textNodeArrayInit(&out->tmplFiles);
    while (*sr->current != '\0') {
        if (strReaderIsDigit(*sr->current)) {
            if (out->pages.length == totalPageCount) {
                printToStdErr("Critical: siteGraph->pages.values overflow. Exiting.\n");
                exit(EXIT_FAILURE);
            }
            siteGraphAddPage(
                out,
                strReaderReadInt(sr), // id
                strReaderReadStr(sr), // url
                strReaderReadInt(sr), // parentId
                strReaderReadStr(sr) // layoutFileName
            );
        } else if (out->pages.length > 0) {
            TextNode text;
            text.id = 0;
            text.chars = strReaderReadStr(sr);
            textNodeArrayPush(&out->tmplFiles, &text);
        } else {
            putError("Unpexted character '%c'.\n", *sr->current);
            return false;
        }
    }
    if (out->pages.length != totalPageCount) {
        printToStdErr("siteGraph->pages.length != definedTotalPageCount");
    }
    if (out->tmplFiles.length != templateCount) {
        printToStdErr("siteGraph->tmplFiles.length != definedTemplateCount");
    }
    return true;
}

void
siteGraphSerialize(SiteGraph *this, char *to) {

}

Page*
siteGraphFindPage(SiteGraph *this, const char *url) {
    for (unsigned i = 0; i < this->pages.length; ++i) {
        if (strcmp(this->pages.values[i].url, url) == 0) {
            return &this->pages.values[i];
        }
    }
    return NULL;
}

void
siteGraphAddPage(SiteGraph *this, unsigned id, char *url, unsigned parentId,
                 char *layoutFileName) {
    Page newPage = {
        .id = id,
        .url = url,
        .parentId = parentId,
        .layoutFileName = layoutFileName
    };
    pageArrayPush(&this->pages, &newPage);
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
pageArrayFreeProps(PageArray *this) {
    for (unsigned i = 0; i < this->capacity; ++i) {
        FREE_STR(this->values[i].url);
        FREE_STR(this->values[i].layoutFileName);
    }
    FREE_ARR(Page, this->values, this->capacity);
    this->capacity = 0;
    this->length = 0;
    this->values = NULL;
}
