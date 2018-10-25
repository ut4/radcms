#ifndef insn_website_h
#define insn_website_h

#include <stdbool.h>
#include "../data-defs.h" // Component
#include "../data-queries.h" // DocumentDataConfig
#include "../db.h"
#include "../duk.h" // duk_context
#include "../file-io.h"
#include "../memory.h"
#include "../static-data.h"
#include "../str-reader.h" // strReaderRead*() etc.
#include "../v-tree-script-bindings.h" // vTreeScriptBindingsExecLayout|Template()
#include "../v-tree.h" // VTree, DocumentDataConfig

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
    char *rootDir; // borrowed from WebApp
    duk_context *dukCtx; // borrowed from main.c
    Db *db; // borrowed from main.c
} Website;

void
websiteInit(Website *this);

void
websiteFreeProps(Website *this);

bool
websiteFetchAndParseSiteGraph(Website *this, char *err);

/**
 * Fetches data for renderOne|All() configurations (*ddc) from the database.
 */
bool
websiteFetchBatches(Website *this, DocumentDataConfig *ddc, ComponentArray *to,
                    char *err);

typedef bool (*pageExportWriteFn)(char *renderedHtml, Page *page, Website *site,
                                  char *err);

bool
websiteGenerate(Website *this, pageExportWriteFn writeFn, char *err);

/**
 * Writes site.ini + data.db + $data->files to $this->rootDir.
 */
bool
websiteInstall(Website *this, SampleData *data, const char *schemaSql,
               char *err);

/**
 * Returns char*|NULL. The caller frees.
 */
char*
pageRender(Website *this, Page *page, const char *url, char *err);

/**
 * Creates a page graph $out from a serialized array $str. $str should be null-
 * terminated.
 */
bool
siteGraphParse(char *str, PageArray *out, StrReader *sr, char *err);

/**
 * Converts $siteGraph to a storable string $to. Example:
 *
 * "4|"                      // 4 pages total
 * "24/|0|a.tmpl|"           // id=24, url=/,    parentId=0,  layoutFileName=a.tmpl
 *     "5/foo|24|b.tmpl|"    // id=5,  url=/foo, parentId=24, layoutFileName=b.tmpl
 *         "8/f/b|5|c.tmpl|" // id=8,  url=/f/b, parentId=5,  layoutFileName=c.tmpl
 * "2/baz|0|a.tmpl"          // id=2,  url=/baz, parentId=0,  layoutFileName=a.tmpl
 * // \0 should always contain null byte
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
void pageArrayFreeProps(PageArray *this);

#endif