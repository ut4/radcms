#include "../../include/web/site-graph.h"

static void pageFreeProps(Page *this);

void
siteGraphInit(SiteGraph *this) {
    hashmap_init(&this->pages);
    this->tmplFiles.capacity = 0;
    this->tmplFiles.length = 0;
    this->tmplFiles.values = NULL;
}

void
siteGraphFreeProps(SiteGraph *this) {
    HashMapElPtr *ptr = this->pages.orderedAccess;
    while (ptr) {
        pageFreeProps((Page*)ptr->data);
        FREE(Page, ptr->data);
        ptr = ptr->next;
    }
    hashmap_free_props(&this->pages);
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
    unsigned templateCount = strReaderReadInt(sr);
    if (templateCount == 0) return false;
    textNodeArrayInit(&out->tmplFiles);
    while (*sr->current != '\0') {
        if (strReaderIsDigit(*sr->current)) {
            unsigned id = strReaderReadInt(sr);
            char *url = strReaderReadStr(sr);
            unsigned parentId = strReaderReadInt(sr);
            char *layoutFileName = strReaderReadStr(sr);
            (void)siteGraphAddPage(out, id, url, parentId, layoutFileName);
        } else if (out->pages.size > 0) {
            TextNode text;
            text.id = 0;
            text.chars = strReaderReadStr(sr);
            textNodeArrayPush(&out->tmplFiles, &text);
        } else {
            putError("Unpexted character '%c'.\n", *sr->current);
            return false;
        }
    }
    if (out->pages.size != totalPageCount) {
        printToStdErr("siteGraph->pages.size != definedTotalPageCount");
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
siteGraphFindPage(SiteGraph *this, char *url) {
    Page *page;
    hashmap_get(&this->pages, url, (void*)&page);
    return page;
}

Page*
siteGraphAddPage(SiteGraph *this, unsigned id, char *url, unsigned parentId,
                 char *layoutFileName) {
    Page *newPage = ALLOCATE(Page);
    newPage->id = id;
    newPage->url = url;
    newPage->parentId = parentId;
    newPage->layoutFileName = layoutFileName;
    hashmap_put(&this->pages, url, (void*)newPage);
    return newPage;
}

void
siteGraphDiffMake(SiteGraph *this, VTree *vTree, void *toMyPtr, char *err) {
    for (unsigned i = 0; i < vTree->elemNodes.length; ++i) {
        if (strcmp(vTree->elemNodes.values[i].tagName, "a") == 0) {
            ElemProp *lfn = elemNodeGetProp(&vTree->elemNodes.values[i], "layoutFileName");
            if (!lfn) continue;
            ElemProp *href = elemNodeGetProp(&vTree->elemNodes.values[i], "href");
            if (!href) {
                printToStdErr("Can't follow a link without href.\n");
                return;
            }
            if (!siteGraphFindPage(this, href->val)) {
                ((struct SiteGraphDiff*)toMyPtr)->newPages = siteGraphAddPage(
                    this, 99, copyString(href->val), 0, copyString(lfn->val));
            }
        }
    }
}

static void
pageFreeProps(Page *this) {
    FREE_STR(this->url);
    FREE_STR(this->layoutFileName);
}