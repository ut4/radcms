#ifndef insn_website_h
#define insn_website_h

#include <stdbool.h>
#include "common-script-bindings.h" // commonScriptBindingsPutDirective()
#include "data-defs.h" // Component
#include "data-queries.h" // DocumentDataConfig
#include "db.h"
#include "duk.h" // duk_context
#include "file-io.h"
#include "file-watcher.h"
#include "memory.h"
#include "static-data.h" // getSampleData, getDbSchemaSql()()
#include "string.h" // StrTube
#include "site-graph.h"
#include "v-tree-script-bindings.h" // vTreeScriptBindingsExecLayout|Template()
#include "v-tree.h" // VTree, DocumentDataConfig

typedef struct {
    SiteGraph siteGraph;
    StrReader strReader;
    char *sitePath; // borrowed from WebApp
    duk_context *dukCtx; // borrowed from main.c
    Db *db; // borrowed from main.c
    char *errBuf; // borrowed from main.c
} Website;

void
websiteInit(Website *this);

void
websiteFreeProps(Website *this);

bool
websiteFetchAndParseSiteGraph(Website *this, char *err);

bool
websitePopulateDukCaches(Website *this, char *err);

bool
websiteFetchBatches(Website *this, DocumentDataConfig *ddc, ComponentArray *to,
                    char *err);

typedef bool (*pageExportWriteFn)(char *renderedHtml, Page *page, Website *site,
                                  void *myPtr, char *err);

unsigned
websiteGenerate(Website *this, pageExportWriteFn writeFn, void *writeFnMyptr,
                StrTube *issues, char *err);

/**
 * Writes site.ini + data.db + $data->files to $this->sitePath.
 */
bool
websiteInstall(Website *this, SampleData *data, const char *schemaSql,
               char *err);

bool
websiteSaveToDb(Website *this, char *err);

bool
websiteCacheTemplate(Website *this, const char *fileName, char *err);

typedef void (*renderInspectFn)(SiteGraph *siteGraph, VTree *vTree, void *dukCtx,
                                void *myPtr, char *err);

/**
 * Returns char*|NULL. The caller frees.
 */
char*
pageRender(Website *this, int layoutIdx, const char *url,
           renderInspectFn inspectFn, void *inspectFnMyPtr, StrTube *errors,
           char *err);

#endif