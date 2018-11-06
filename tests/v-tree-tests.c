#include "v-tree-tests.h"

static void
testVTreeRenderRendersNodesWithNoChildren() {
    // 1. Setup
    VTree vTree;
    vTreeInit(&vTree);
    vTreeCreateElemNode(&vTree, "article", NULL, NULL);
    vTree.rootElemIndex = 0;
    // 2. Call
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    char *out = vTreeToHtml(&vTree, errBuf);
    // 3. Assert
    assertStrEquals(out, "<article></article>");
    //
    vTreeFreeProps(&vTree);
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
    unsigned h2Ref = vTreeCreateElemNode(&vTree, "h2", NULL, &h2Content);
    unsigned pTextRef = vTreeCreateTextNode(&vTree, "Some text");
    NodeRefArray pContent;
    nodeRefArrayInit(&pContent);
    nodeRefArrayPush(&pContent, pTextRef);
    unsigned pRef = vTreeCreateElemNode(&vTree, "p", NULL, &pContent);
    NodeRefArray articleChildren;
    nodeRefArrayInit(&articleChildren);
    nodeRefArrayPush(&articleChildren, h2Ref);
    nodeRefArrayPush(&articleChildren, pRef);
    vTreeCreateElemNode(&vTree, "article", NULL, &articleChildren);
    vTree.rootElemIndex = vTree.elemNodes.length - 1;
    // 2. Call
    char errBuf[ERR_BUF_LEN];
    char *out = vTreeToHtml(&vTree, errBuf);
    // 3. Assert
    assertStrEquals(out, "<article><h2>Hello</h2><p>Some text</p></article>");
    //
    vTreeFreeProps(&vTree);
    FREE_STR(out);
}

static void
testVTreeRenderRendersSingleAttribute() {
    //
    VTree vTree;
    vTreeInit(&vTree);
    ElemProp *props = elemPropCreate("foo", "bar");
    vTreeCreateElemNode(&vTree, "article", props, NULL);
    vTree.rootElemIndex = 0;
    //
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    char *out = vTreeToHtml(&vTree, errBuf);
    //
    assertStrEquals(out, "<article foo=\"bar\"></article>");
    //
    vTreeFreeProps(&vTree);
    FREE_STR(out);
}

static void
testVTreeRenderRendersMultipleAttributes() {
    //
    VTree vTree;
    vTreeInit(&vTree);
    ElemProp *props = elemPropCreate("foo", "bar");
    ElemProp *prop2 = elemPropCreate("baz", "naz");
    props->next = prop2;
    vTreeCreateElemNode(&vTree, "article", props, NULL);
    vTree.rootElemIndex = 0;
    //
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    char *out = vTreeToHtml(&vTree, errBuf);
    //
    assertStrEquals(out, "<article foo=\"bar\" baz=\"naz\"></article>");
    //
    vTreeFreeProps(&vTree);
    FREE_STR(out);
}

static void
testVTreeReplaceRefReplacesRootLevelRef() {
    // 1. Setup
    VTree vTree;
    vTreeInit(&vTree);
    NodeRefArray divContent;
    nodeRefArrayInit(&divContent);
    unsigned attachedTextRef = vTreeCreateTextNode(&vTree, "foo");
    unsigned attachedTextId = GET_NODEID(attachedTextRef);
    nodeRefArrayPush(&divContent, attachedTextRef);
    vTreeCreateElemNode(&vTree, "div", NULL, &divContent);
    vTree.rootElemIndex = 0;
    unsigned detachedTextRef = vTreeCreateTextNode(&vTree, "Hello");
    NodeRefArray actualDivsChildren = vTree.elemNodes.values[0].children;
    unsigned refBefore = actualDivsChildren.values[0];
    // 2. Call
    bool success = vTreeReplaceRef(&vTree, TYPE_TEXT, attachedTextId, detachedTextRef);
    assertThatOrGoto(success, done, "Should return succesfully");
    // 3. Assert
    NodeRefArray actualDivsChildrenAfter = vTree.elemNodes.values[0].children;
    unsigned refAfter = actualDivsChildrenAfter.values[0];
    assertThat(refAfter != refBefore, "Should update $oldRef -> $newTextRef");
    assertIntEquals(GET_NODETYPE(refAfter), TYPE_TEXT);
    assertIntEquals(GET_NODEID(refAfter), GET_NODEID(detachedTextRef));
    //
    done:
    vTreeFreeProps(&vTree);
}

void
vTreeTestsRun() {
    testVTreeRenderRendersNodesWithNoChildren();
    testVTreeRenderRendersNodes();
    testVTreeRenderRendersSingleAttribute();
    testVTreeRenderRendersMultipleAttributes();
    testVTreeReplaceRefReplacesRootLevelRef();
}
