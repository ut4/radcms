#ifndef insn_websiteDiffManager_h
#define insn_websiteDiffManager_h

#include "website.h"

typedef struct {
    PageRef *newPages;
    PageRef *newPagesTail;
    StrTube staticFiles;
} WebsiteDiff;

void
websiteDiffInit(WebsiteDiff *this);

void
websiteDiffFreeProps(WebsiteDiff *this);

bool
websiteDiffPerformRescan(Website *this, const char *url, int layoutIdx,
                         char *err);

#endif