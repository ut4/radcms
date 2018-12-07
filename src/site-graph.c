#include "../include/site-graph.h"

static void pageFreeProps(Page *this);

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
    if (!strReaderIsDigit(str[0])) {
        putError("ParseError: Expected a digit but got '%c'.\n", str[0]);
        return false;
    }
    strReaderInit(sr, str, '|');
    unsigned totalPageCount = strReaderReadInt(sr);
    unsigned templateCount = strReaderReadInt(sr);
    if (templateCount == 0) return false;
    while (*sr->current != '\0') {
        if (strReaderIsDigit(*sr->current)) {
            unsigned id = strReaderReadInt(sr);
            char *url = strReaderReadStr(sr);
            unsigned parentId = strReaderReadInt(sr);
            int layoutIdx = (int)strReaderReadInt(sr);
            (void)siteGraphAddPage(out, id, url, parentId, layoutIdx);
        } else if (out->pages.size > 0) {
            Template *t = siteGraphAddTemplate(out, strReaderReadStr(sr));
            unsigned tIdx = out->templates.length - 1;
            HashMapElPtr *ptr = out->pages.orderedAccess;
            while (ptr) {
                if (((Page*)ptr->data)->layoutIdx == tIdx) {
                    t->sampleUrl = ((Page*)ptr->data)->url;
                    break;
                }
                ptr = ptr->next;
            }
        } else {
            putError("Unpexted character '%c'.\n", *sr->current);
            return false;
        }
    }
    if (out->pages.size != totalPageCount) {
        printToStdErr("Warn: siteGraph->pages.size != definedTotalPageCount");
    }
    if (out->templates.length != templateCount) {
        printToStdErr("Warn: siteGraph->templates.length != definedTemplateCount");
    }
    return true;
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
        printToStdErr("Error: siteGraphSerialize: Failed to allocate $out.\n");
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

void
siteGraphDiffInit(SiteGraphDiff *this) {
    this->newPages = NULL;
    this->newPagesTail = NULL;
}

void
siteGraphDiffFreeProps(SiteGraphDiff *this) {
    this->newPagesTail = NULL;
    PageRef *cur = this->newPages;
    PageRef *tmp;
    while (cur) {
        tmp = cur;
        cur = cur->next;
        FREE(PageRef, tmp);
    }
}

void
siteGraphDiffMake(SiteGraph *this, VTree *vTree, void *dukCtx, void *toMyPtr,
                  char *err) {
    for (unsigned i = 0; i < vTree->elemNodes.length; ++i) {
        if (strcmp(vTree->elemNodes.values[i].tagName, "a") != 0) continue;
        ElemProp *lfn = elemNodeGetProp(&vTree->elemNodes.values[i], "layoutFileName");
        // layoutFileName-attribute not defined -> skip
        if (!lfn) continue;
        ElemProp *href = elemNodeGetProp(&vTree->elemNodes.values[i], "href");
        if (!href) {
            printToStdErr("Error: Can't follow a link without href.\n");
            return;
        }
        // Page already in the site-graph -> skip
        if (siteGraphFindPage(this, href->val)) continue;
        char *hrefUrl = copyString(href->val);
        // New page -> add it
        int layoutIdx = -1;
        (void)siteGraphFindTemplate(this, lfn->val, &layoutIdx);
        if (layoutIdx == -1) {
            Template *l = siteGraphAddTemplate(this, copyString(lfn->val));
            l->sampleUrl = hrefUrl;
            l->exists = false;
            layoutIdx = this->templates.length - 1;
        }
        PageRef *n = ALLOCATE(PageRef);
        n->next = NULL;
        n->ptr = siteGraphAddPage(this, 99, hrefUrl, 0, layoutIdx);
        SiteGraphDiff *diff = toMyPtr;
        if (diff->newPages) {
            diff->newPagesTail->next = n;
            diff->newPagesTail = n;
        } else {
            diff->newPages = n;
            diff->newPagesTail = diff->newPages;
        }
    }
}

static void
pageFreeProps(Page *this) {
    FREE_STR(this->url);
}

void templateArrayInit(TemplateArray *this) {
    arrayInit(Template, 0);
}
void templateArrayPush(TemplateArray *this, Template value) {
    arrayPush(Template, value);
}
void templateArrayFreeProps(TemplateArray *this) {
    for (unsigned i = 0; i < this->length; ++i) {
        FREE_STR(this->values[i].fileName);
    }
    arrayFreeProps(Template);
}
