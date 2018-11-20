#include "../../include/web/site-graph.h"

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
            siteGraphAddTemplate(out, strReaderReadStr(sr))->exists = true;
        } else {
            putError("Unpexted character '%c'.\n", *sr->current);
            return false;
        }
    }
    if (out->pages.size != totalPageCount) {
        printToStdErr("siteGraph->pages.size != definedTotalPageCount");
    }
    if (out->templates.length != templateCount) {
        printToStdErr("siteGraph->templates.length != definedTemplateCount");
    }
    return true;
}

void
siteGraphSerialize(SiteGraph *this, char *to) {

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

void
siteGraphDiffMake(SiteGraph *this, VTree *vTree, void *toMyPtr, char *err) {
    bool TEMPadded = false;
    for (unsigned i = 0; i < vTree->elemNodes.length; ++i) {
        if (strcmp(vTree->elemNodes.values[i].tagName, "a") == 0 && !TEMPadded) {
            ElemProp *lfn = elemNodeGetProp(&vTree->elemNodes.values[i], "layoutFileName");
            // layoutFileName-attribute not defined -> skip
            if (!lfn) continue;
            ElemProp *href = elemNodeGetProp(&vTree->elemNodes.values[i], "href");
            if (!href) {
                printToStdErr("Can't follow a link without href.\n");
                return;
            }
            // Page already in the site-graph -> skip
            if (siteGraphFindPage(this, href->val)) continue;
            // New page -> add it
            int layoutIdx = -1;
            (void)siteGraphFindTemplate(this, lfn->val, &layoutIdx);
            if (layoutIdx == -1) {
                (void)siteGraphAddTemplate(this, copyString(lfn->val));
                layoutIdx = this->templates.length - 1;
            }
            ((struct SiteGraphDiff*)toMyPtr)->newPages = siteGraphAddPage(
                this, 99, copyString(href->val), 0, layoutIdx);
            TEMPadded = true;
        }
    }
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
    Template newLayout;
    newLayout.fileName = fileName;
    newLayout.exists = false;
    newLayout.hasErrors = false;
    templateArrayPush(&this->templates, &newLayout);
    return &this->templates.values[this->templates.length - 1];
}

static void
pageFreeProps(Page *this) {
    FREE_STR(this->url);
}

void templateArrayInit(TemplateArray *this) {
    this->length = 0;
    this->capacity = 0;
    this->values = NULL;
}
void templateArrayPush(TemplateArray *this, Template *value) {
    if (this->capacity < this->length + 1) {
        unsigned oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, Template,
                                  oldCapacity, this->capacity);
    }
    this->values[this->length] = *value;
    this->length++;
}
void templateArrayFreeProps(TemplateArray *this) {
    if (this->length) {
        for (unsigned i = 0; i < this->length; ++i) {
            FREE_STR(this->values[i].fileName);
        }
        FREE_ARR(Template, this->values, this->capacity);
    }
    templateArrayInit(this);
}
