#include "v-tree-tests.h"

static void
testvTreeRenderRendersNodesWithNoChildren() {
    // 1. Setup
    VTree tree;
    vTreeInit(&tree);
    vTreeCreateElemNode(&tree, "article", NULL);
    // 2. Call
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    char *out = vTreeToHtml(&tree, errBuf);
    // 3. Assert
    assertStrEquals(out, "<article></article>");
    //
    vTreeDestruct(&tree);
    FREE_STR(out);
}

static void
testvTreeRenderRendersNodes() {
    // 1. Setup
    VTree tree;
    vTreeInit(&tree);
    unsigned h2TextRef = vTreeCreateTextNode(&tree, "Hello");
    NodeRefArray h2Content;
    nodeRefArrayInit(&h2Content);
    nodeRefArrayPush(&h2Content, h2TextRef);
    unsigned h2Ref = vTreeCreateElemNode(&tree, "h2", &h2Content);
    unsigned pTextRef = vTreeCreateTextNode(&tree, "Some text");
    NodeRefArray pContent;
    nodeRefArrayInit(&pContent);
    nodeRefArrayPush(&pContent, pTextRef);
    unsigned pRef = vTreeCreateElemNode(&tree, "p", &pContent);
    NodeRefArray articleChildren;
    nodeRefArrayInit(&articleChildren);
    nodeRefArrayPush(&articleChildren, h2Ref);
    nodeRefArrayPush(&articleChildren, pRef);
    vTreeCreateElemNode(&tree, "article", &articleChildren);
    // 2. Call
    char errBuf[ERR_BUF_LEN];
    char *out = vTreeToHtml(&tree, errBuf);
    // 3. Assert
    assertStrEquals(out, "<article><h2>Hello</h2><p>Some text</p></article>");
    //
    vTreeDestruct(&tree);
    FREE_STR(out);
}

void
vTreeTestsRun() {
    testvTreeRenderRendersNodesWithNoChildren();
    testvTreeRenderRendersNodes();
}
