#include "../include/generating.h"
#include <assert.h> // temp
#include <string.h> // temp

// == Generator ====
// =============================================================================
void generatorInit(Generator *this, TemplateProvider *tp, VTree *vTree,
                   DocumentDataConfig *ddc) {
    this->templateProvider = tp;
    this->vTree = vTree;
    this->ddc = ddc;
}

// TODO move this to somewhere else
static bool callTmplFn(DataBatchConfig *dbc, lua_State *L, VTree *vTree,
                       DocumentDataConfig *ddc, char *err) {
    luaPushVTree(L, vTree);                    // [fn, userdata]
    // <temp-hack>
    char *templateName = dbc->renderUsing;
    if (strcmp(templateName, "articles.lua") == 0) {
        lua_createtable(L, 3, 0);              // stack: [...table1]
        //
        lua_createtable(L, 0, 2);              // stack: [...table1, article1Table]
        lua_pushstring(L, "Article 1");
        lua_setfield(L, -2, "title");          // article1Table.title = stack.last()
        lua_pushstring(L, "This is the 1st article.");
        lua_setfield(L, -2, "body");           // article1Table.body = stack.last()
        lua_seti(L, -2, 1);                    // table1[1] = article1Table
        //
        lua_createtable(L, 0, 2);              // stack: [...table1, article2Table]
        lua_pushstring(L, "Article 2");
        lua_setfield(L, -2, "title");          // article2Table.title = stack.last()
        lua_pushstring(L, "This is the 2nd article.");
        lua_setfield(L, -2, "body");           // article2Table.body = stack.last()
        lua_seti(L, -2, 2);                    // table1[2] = article2Table
        //
        lua_createtable(L, 0, 2);              // stack: [...table1, article3Table]
        lua_pushstring(L, "Article 3");
        lua_setfield(L, -2, "title");          // article3Table.title = stack.last()
        lua_pushstring(L, "This is the 3th article.");
        lua_setfield(L, -2, "body");           // article3Table.body = stack.last()
        lua_seti(L, -2, 3);                    // table1[3] = article3Table
    } else if (strcmp(templateName, "footer.lua") == 0) {
        lua_createtable(L, 0, 1);              // stack: [...table]
        lua_pushstring(L, "(c) 2005 MySite");
        lua_setfield(L, -2, "content");        // table.content = stack.last()
    } else {
        assert(false);
    }
    // </temp-hack>
    //                                            stack: [fn, userdata, table]
    if (lua_pcall(L, 2, 0, 0) == LUA_OK) {     // []
        return true;
    }
    sprintf(err, getLuaErrorDetails(L));
    return false;
}

static int renderBatches(Generator *this, char *err) {
    VTree *vTree = this->vTree;
    lua_State *L = this->templateProvider->L;
    int nodeCount = vTree->nodes.length;
    int documentRootNodeIndex = nodeCount - 1;
    for (int i = 0; i < vTree->nodes.length; ++i) {
        VNode *node = &vTree->nodes.values[i];
        /*
         * Single dataBatchConfig, e("body", renderAll()) -> replace with
         * NODE_CONTENT_NODE_REF (which points to the root node of the rendered
         * template)
         */
        if (node->content->type == NODE_CONTENT_DATA_BATCH_CONFIG) {
            DataBatchConfig *tdbc = node->content->v.dbcRef->ref;
            if (!templateProviderLoadFnFromFile(this->templateProvider,
                                                tdbc->renderUsing, err)) {
                return -1;
            }
            if (!callTmplFn(tdbc, L, vTree, this->ddc, err)) {
                return -1;
            }
            node = &vTree->nodes.values[i]; // in case of invalidation
            nodeCount = vTree->nodes.length;
            FREE(node->content->v.dbcRef);
            nodeContentInitWithNodeRef(node->content,
                                        // root node of the template is always the last node of vTree.nodes
                                        vTree->nodes.values[nodeCount - 1].id);
        /*
         * DataBatchConfig array, e("body", {renderAll(), renderOne()...}) ->
         * replace with NODE_CONTENT_NODE_REF_ARR (which values point to the root
         * nodes of the rendered templates)
         */
        } else if (node->content->type == NODE_CONTENT_DATA_BATCH_CONFIG_ARR) {
            VNodeRefArray *tmplRootNodeRefs = ALLOCATE(VNodeRefArray, 1);
            vNodeRefArrayInit(tmplRootNodeRefs); // todo setlength to avoid unnecessary reallocs
            DataBatchConfigRefListNode *curRef = node->content->v.dbcRef;
            //
            while (curRef) {
                DataBatchConfig *tdbc = curRef->ref;
                if (!templateProviderLoadFnFromFile(this->templateProvider,
                                                    tdbc->renderUsing, err)) {
                    vNodeRefArrayDestruct(tmplRootNodeRefs);
                    return -1;
                }
                if (!callTmplFn(tdbc, L, vTree, this->ddc, err)) {
                    vNodeRefArrayDestruct(tmplRootNodeRefs);
                    return -1;
                }
                node = &vTree->nodes.values[i]; // in case of invalidation
                nodeCount = vTree->nodes.length;
                vNodeRefArrayPush(tmplRootNodeRefs, vTree->nodes.values[nodeCount - 1].id);
                curRef = curRef->next;
            }
            FREE(node->content->v.dbcRef); // todo free each backwards
            nodeContentInitWithNodeRefArr(node->content, tmplRootNodeRefs);
        }
    }
    return documentRootNodeIndex;
}

bool generatorGeneratePage(Generator *this, WebPage *out, const char *url,
                           char *err) {
    // 0. todo Compose a (no)sql query from { renderAll('Something') } configs
    // 1. todo Fetch the data from database using the query
    // 2. Render and substitute each { renderAll(...).using(templatename.tmpl) }
    int documentRootNodeIndex = renderBatches(this, err);
    if (documentRootNodeIndex < 0) {
        return false;
    }
    /* At this point, vTree.nodes may look something like this:
    [
        title   <- main layout starts
        body
        html    <- main layout ends, $documentRootNodeIndex
        h2      <- template1 starts
        p
        article
        h2
        p
        article
        ...
        div      <- template1 ends
        div      <- template2 starts
        footer   <- template2 ends
        ...      <- template3 starts
        ...
    ]
    */
    // 3. Generate the document
    webPageInit(out, vTreeToHtml(this->vTree, documentRootNodeIndex), url);
    // 4. Done
    return true;
}

bool generatorGenerateSite(Generator *this, WebSite *out, const char *url,
                           char *err) {
    // 0. todo Compose a (no)sql query from { renderAll('Something') } configs
    // 1. todo Fetch the data from database using the query
    // 2. Render and substitute each { renderAll(...).using(templatename.tmpl) }
    int documentRootNodeIndex = renderBatches(this, err);
    if (documentRootNodeIndex < 0) {
        return false;
    }
    // 3. Generate the document
    WebPage *page = ALLOCATE(WebPage, 1);
    webPageInit(page, vTreeToHtml(this->vTree, documentRootNodeIndex), url);
    webSiteAddPage(out, page);
    // 4. todo Generate some more documents by following the <link>
    // 5. Done
    return true;
}

// == WebPage ====
// =============================================================================
void webPageInit(WebPage *this, char *html, const char *url) {
    this->url = url;
    this->html = html;
    this->next = NULL;
}
void webPageDestruct(WebPage *this) {
    FREE(this);
}

// == WebSite ====
// =============================================================================
void webSiteInit(WebSite *this) {
    this->pages = NULL;
    this->head = NULL;
    this->pageCount = 0;
}
void webSiteDestructPages(WebSite *this) {
    WebPage* refs[this->pageCount];
    int reverseI = this->pageCount - 1;
    WebPage *cur = this->pages;
    while (cur) {
        refs[reverseI] = cur;
        reverseI--;
        cur = cur->next;
    }
    for (int i = 0; i < this->pageCount; ++i) {
        webPageDestruct(refs[i]);
    }
}
void webSiteAddPage(WebSite *this, WebPage *page) {
    if (this->pageCount > 0) {
        this->head->next = page;
        this->head = this->head->next;
    } else {
        this->pages = page; // root node of the linked list
        this->head = page;
    }
    this->pageCount++;
}