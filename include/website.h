#ifndef insn_website_h
#define insn_website_h

#include "memory.h"

struct PageArray;
typedef struct PageArray PageArray;

typedef struct {
    unsigned id;
    char *url; // eg. "/" or "/foo/bar"
    unsigned parentId;
} Page;

typedef struct {
    PageArray *siteGraph;
} Website;

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

struct PageArray {
    unsigned capacity;
    unsigned length;
    Page *values;
};
void pageArrayInit(PageArray *this, unsigned capacity);
void pageArrayPush(PageArray *this, Page *page);
void pageArrayDestruct(PageArray *this);

#endif