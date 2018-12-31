#ifndef insn_siteGraph_h
#define insn_siteGraph_h

#include <math.h> // log10
#include "common/array.h"
#include "common/hashmap.h"
#include "v-tree.h"

typedef struct {
    unsigned id;
    char *url; // eg. "/" or "/foo/bar"
    unsigned parentId;
    int layoutIdx; // index of SiteGraph.templates
} Page;

typedef struct {
    char *fileName; // eg. "file.js"
    char *sampleUrl; // borrowed from Page
    bool exists;
} Template;

typedef struct  {
    unsigned capacity;
    unsigned length;
    Template *values;
} TemplateArray;

typedef struct {
    HashMap pages;
    TemplateArray templates;
} SiteGraph;

struct PageRef;
typedef struct PageRef PageRef;
struct PageRef {
    Page *ptr; // borrowed from SiteGraph.pages
    PageRef *next;
};

typedef struct {
    char *current;
    char END_OF_VAL; // like a \0, but for values inside the string
} StrReader;

void
siteGraphInit(SiteGraph *this);

void
siteGraphFreeProps(SiteGraph *this);

/**
 * Creates a page graph $out from a serialized array $str. $str should be null-
 * terminated.
 */
bool
siteGraphParse(char *str, SiteGraph *out, StrReader *sr, char *err);

/**
 * Converts $this to a storable string $to. Example:
 *
 * "4|"                 // 4 pages total
 * "3|"                 // 3 templates total
 * "24/|0|0|"           // id=24, url=/,    parentId=0,  layoutIdx=0
 *     "5/foo|24|1|"    // id=5,  url=/foo, parentId=24, layoutIdx=1
 *         "8/f/b|5|2|" // id=8,  url=/f/b, parentId=5,  layoutIdx=2
 * "2/baz|0|0|"         // id=2,  url=/baz, parentId=0,  layoutIdx=0
 * "a.tmpl|"            // 1. template name
 * "b.tmpl|"            // 2. template name
 * "c.tmpl"             // 3. template name
 * // \0 Always contains null byte
 *
 * The caller frees.
 */
char*
siteGraphSerialize(SiteGraph *this);

/**
 * Returns Page|NULL.
 */
Page*
siteGraphFindPage(SiteGraph *this, char *url);

/**
 * Takes ownership of $url
 */
Page*
siteGraphAddPage(SiteGraph *this, unsigned id, char *url, unsigned parentId,
                 int layoutIdx);

Template*
siteGraphFindTemplate(SiteGraph *this, char *fileName, int *idxOut);

Template*
siteGraphGetTemplate(SiteGraph *this, int idx);

/**
 * Takes ownership of $fileName
 */
Template*
siteGraphAddTemplate(SiteGraph *this, char *fileName);

#endif