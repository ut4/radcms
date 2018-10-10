#ifndef insn_website_h
#define insn_website_h

#include <stdbool.h>
#include "../memory.h"
#include "../web-app-common.h" // microhttpd

struct Page;
typedef struct Page Page;
typedef struct {
    unsigned capacity;
    unsigned length;
    Page *values;
} PageArray;

struct Page {
    unsigned id;
    char *url; // eg. "/" or "/foo/bar"
    unsigned parentId;
};

typedef struct {
    PageArray siteGraph;
} Website;

bool
webSiteInit(Website *this, char *err);

void
websiteDestruct(Website *this);

/**
 * Responds to GET /<any> eg "/" or "/foo" or "/foo/bar/baz".
 */
unsigned
websiteHandlersHandlePageRequest(void *this, const char *method, const char *url,
                                 struct MHD_Response **response);

/**
 * Creates a page graph $out from a serialized array $str. $str should be null-
 * terminated.
 */
bool
siteGraphParse(char *str, PageArray *out, char *err);

/**
 * Converts $siteGraph to a storable string $to. Example:
 *
 * "3|" +               // 3 pages total
 * "24/|0|" +           // id=24, url=/, parentId=0
 *     "5/foo|24|" +    // id=5, url=/foo, parentId=24
 *         "8/f/b|5|" + // id=8, url=/f/b, parentId=5
 *  "2/baz|0";          // id=2, url=/baz, parentId=0
 *  // \0 should always contain null byte
 */
void
siteGraphSerialize(PageArray *siteGraph, char *to);

/**
 * Returns Page|NULL.
 */
Page*
siteGraphFindPage(PageArray *siteGraph, const char *url);

void pageArrayInit(PageArray *this, unsigned capacity);
void pageArrayPush(PageArray *this, Page *page);
void pageArrayDestruct(PageArray *this);

#endif