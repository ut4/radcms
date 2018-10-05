#ifndef rad3_generating_h
#define rad3_generating_h

#include "data-access.h" // DocumentDataConfig
#include "lualib.h"      // luaPushVTree
#include "templating.h"  // TemplateProvider
#include "vtree.h"       // VTree

struct WebPage;
typedef struct WebPage WebPage;
struct WebPage {
    const char *url;
    char *html;
    WebPage *next;
};
/*
 * Initializes $this. $html points to (and is managed by) vTree->render.
 */
void webPageInit(WebPage *this, char *html, const char *url);
void webPageDestruct(WebPage *this);

// -----------------------------------------------------------------------------

typedef struct {
    WebPage *pages;
    WebPage *head;
    int pageCount;
} WebSite;
void webSiteInit(WebSite *this);
void webSiteDestructPages(WebSite *this);
void webSiteAddPage(WebSite *this, WebPage *page);

// -----------------------------------------------------------------------------

typedef struct {
    TemplateProvider *templateProvider;
    VTree *vTree;
    DocumentDataConfig *ddc;
} Generator;

void generatorInit(Generator *this, TemplateProvider *tp, VTree *vTree,
                   DocumentDataConfig *ddc);

/*
 * Generates a web page into $out. Returns true on success. On failure, returns
 * false and puts the error message into $err.
 */
bool generatorGeneratePage(Generator *this, WebPage *out, const char *url,
                           char *err);

/*
 * Generates the website into $out. Returns true on success. On failure, returns
 * false and puts the error message into $err.
 */
bool generatorGenerateSite(Generator *this, WebSite *out, const char *url,
                           char *err);

#endif