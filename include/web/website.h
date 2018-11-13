#ifndef insn_website_h
#define insn_website_h

#include <stdbool.h>
#include "../data-defs.h" // Component
#include "../data-queries.h" // DocumentDataConfig
#include "../db.h"
#include "../duk.h" // duk_context
#include "../file-io.h"
#include "../file-watcher.h"
#include "../memory.h"
#include "../static-data.h" // getSampleData()
#include "site-graph.h"
#include "../v-tree-script-bindings.h" // vTreeScriptBindingsExecLayout|Template()
#include "../v-tree.h" // VTree, DocumentDataConfig

typedef struct {
    SiteGraph siteGraph;
    StrReader strReader;
    char *rootDir; // borrowed from WebApp
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
websitePopulateTemplateCaches(Website *this, char *err);

bool
websiteFetchBatches(Website *this, DocumentDataConfig *ddc, ComponentArray *to,
                    char *err);

typedef bool (*pageExportWriteFn)(char *renderedHtml, Page *page, Website *site,
                                  void *myPtr, char *err);

bool
websiteGenerate(Website *this, pageExportWriteFn writeFn, void *myPtr, char *err);

/**
 * Writes site.ini + data.db + $data->files to $this->rootDir.
 */
bool
websiteInstall(Website *this, SampleData *data, const char *schemaSql,
               char *err);

bool
websiteCheckIsFWFileAcceptable(const char *fileName);

void
websiteHandleFWEvent(FWEventType type, const char *fileName, void *myPtr);

typedef void (*renderInspectFn)(SiteGraph *siteGraph, VTree *vTree, void *myPtr,
                                char *err);

/**
 * Returns char*|NULL. The caller frees.
 */
char*
pageRender(Website *this, const char *layoutFileName, const char *url,
           renderInspectFn inspectFn, void *myPtr, char *err);

#endif