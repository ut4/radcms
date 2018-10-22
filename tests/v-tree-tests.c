#include "v-tree-tests.h"

static void
testVTreeRenderRendersNodesWithNoChildren() {
    // 1. Setup
    VTree vTree;
    vTreeInit(&vTree);
    vTreeCreateElemNode(&vTree, "article", NULL);
    vTree.rootElemIndex = 0;
    // 2. Call
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    char *out = vTreeToHtml(&vTree, errBuf);
    // 3. Assert
    assertStrEquals(out, "<article></article>");
    //
    vTreeDestruct(&vTree);
    FREE_STR(out);
}

static void
testVTreeRenderRendersNodes() {
    // 1. Setup
    VTree vTree;
    vTreeInit(&vTree);
    unsigned h2TextRef = vTreeCreateTextNode(&vTree, "Hello");
    NodeRefArray h2Content;
    nodeRefArrayInit(&h2Content);
    nodeRefArrayPush(&h2Content, h2TextRef);
    unsigned h2Ref = vTreeCreateElemNode(&vTree, "h2", &h2Content);
    unsigned pTextRef = vTreeCreateTextNode(&vTree, "Some text");
    NodeRefArray pContent;
    nodeRefArrayInit(&pContent);
    nodeRefArrayPush(&pContent, pTextRef);
    unsigned pRef = vTreeCreateElemNode(&vTree, "p", &pContent);
    NodeRefArray articleChildren;
    nodeRefArrayInit(&articleChildren);
    nodeRefArrayPush(&articleChildren, h2Ref);
    nodeRefArrayPush(&articleChildren, pRef);
    vTreeCreateElemNode(&vTree, "article", &articleChildren);
    vTree.rootElemIndex = vTree.elemNodes.length - 1;
    // 2. Call
    char errBuf[ERR_BUF_LEN];
    char *out = vTreeToHtml(&vTree, errBuf);
    // 3. Assert
    assertStrEquals(out, "<article><h2>Hello</h2><p>Some text</p></article>");
    //
    vTreeDestruct(&vTree);
    FREE_STR(out);
}

static void
testVTreeReplaceRefReplacesRootLevelRef() {
    // 1. Setup
    VTree vTree;
    vTreeInit(&vTree);
    NodeRefArray divContent;
    nodeRefArrayInit(&divContent);
    unsigned dbcRef = vTreeUtilsMakeNodeRef(TYPE_DATA_BATCH_CONFIG, 1);
    nodeRefArrayPush(&divContent, dbcRef);
    vTreeCreateElemNode(&vTree, "div", &divContent);
    vTree.rootElemIndex = 0;
    unsigned detachedTextRef = vTreeCreateTextNode(&vTree, "Hello");
    NodeRefArray actualDivsChildren = vTree.elemNodes.values[0].children;
    unsigned refBefore = actualDivsChildren.values[0];
    // 2. Call
    bool success = vTreeReplaceRef(&vTree, TYPE_DATA_BATCH_CONFIG, 1,
                                   detachedTextRef);
    assertThatOrGoto(success, done, "Should return succesfully");
    // 3. Assert
    NodeRefArray actualDivsChildrenAfter = vTree.elemNodes.values[0].children;
    unsigned refAfter = actualDivsChildrenAfter.values[0];
    assertThat(refAfter != refBefore, "Should update $oldRef -> $newTextRef");
    assertIntEquals(GET_NODETYPE(refAfter), TYPE_TEXT);
    assertIntEquals(GET_NODEID(refAfter), 1);
    //
    done:
    vTreeDestruct(&vTree);
}

void
vTreeTestsRun() {
    testVTreeRenderRendersNodesWithNoChildren();
    testVTreeRenderRendersNodes();
    testVTreeReplaceRefReplacesRootLevelRef();
}
