#ifndef insn_website_h
#define insn_website_h

#include <stdbool.h>
#include "../db.h"
#include "../memory.h"
#include "../str-reader.h" // strReaderRead*() etc.

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
    char *layoutFileName;
};

typedef struct {
    PageArray siteGraph;
    StrReader strReader;
} Website;

void
websiteInit(Website *this);

void
websiteDestruct(Website *this);

bool
websiteFetchAndParseSiteGraph(Website *this, Db *db, char *err);

/**
 * Creates a page graph $out from a serialized array $str. $str should be null-
 * terminated.
 */
bool
siteGraphParse(char *str, PageArray *out, StrReader *sr, char *err);

/**
 * Converts $siteGraph to a storable string $to. Example:
 *
 * "4|" +                 // 4 pages total
 * "24/|0|a.b|" +         // id=24, url=/,    parentId=0,  layoutFileName=a.b
 *     "5/foo|24|b|" +    // id=5,  url=/foo, parentId=24, layoutFileName=b
 *         "8/f/b|5|c|" + // id=8,  url=/f/b, parentId=5,  layoutFileName=c
 *  "2/baz|0|d|";         // id=2,  url=/baz, parentId=0,  layoutFileName=d
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