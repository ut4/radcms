#include "v-tree-script-bindings-tests.h"

#define beforeEach() \
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0'; \
    duk_context *ctx = myDukCreate(errBuf); \
    if (!ctx) { printToStdErr("Failed to create duk_context\n"); exit(EXIT_FAILURE); } \
    vTreeScriptBindingsRegister(ctx); \
    dataQueryScriptBindingsRegister(ctx)

static void
testExecLayoutConfiguresGlobalScope() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    // 2. Call
    char *myLayout = "vTree !== undefined; documentDataConfig !== undefined;";
    bool success = vTreeScriptBindingsExecLayout(ctx, myLayout, &vTree, &ddc, errBuf);
    // 3. Assert
    assertThat(success, "Should return succesfully");
    //
    duk_destroy_heap(ctx);
    vTreeDestruct(&vTree);
    documentDataConfigDestruct(&ddc);
}

static void
testVTreeRegisterElementWithElemAndTextChildren() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    // 2. Call
    char *myLayout = "vTree.registerElement(\"div\", null, [" // multiple nodes as children
        "vTree.registerElement(\"h2\", null,"                 // single node as a children
            "vTree.registerElement(\"span\", null, \"foo\")"  // text as a children
        "),"
        "vTree.registerElement(\"p\", null, \"bar\")"
    "])";
    bool success = vTreeScriptBindingsExecLayout(ctx, myLayout, &vTree, &ddc, errBuf);
    // 3. Assert
    assertThatOrGoto(success, done, "Should return succesfully");
    assertIntEqualsOrGoto(vTree.elemNodes.length, 4, done);
    assertIntEqualsOrGoto(vTree.textNodes.length, 2, done);
    // div > h2 > span
    ElemNode *span = vTreeFindElemNodeByTagName(&vTree, "span");
    assertThatOrGoto(span != NULL, done, "Should register <span>");
    assertIntEqualsOrGoto(span->children.length, 1, done);
    TextNode *spanText = vTreeFindTextNode(&vTree, span->children.values[0]);
    assertThatOrGoto(spanText != NULL, done, "Should register <span>'s textNode");
    assertStrEquals(spanText->chars, "foo");
    // div > h2
    ElemNode *h2 = vTreeFindElemNodeByTagName(&vTree, "h2");
    assertThatOrGoto(h2 != NULL, done, "Should register <h2>");
    assertIntEqualsOrGoto(h2->children.length, 1, done);
    assertThatOrGoto(vTreeFindElemNode(&vTree, h2->children.values[0]) == span,
                     done, "h2.children[0] == span");
    // div > p
    ElemNode *p = vTreeFindElemNodeByTagName(&vTree, "p");
    assertThatOrGoto(p != NULL, done, "Should register <p>");
    assertIntEqualsOrGoto(p->children.length, 1, done);
    TextNode *pText = vTreeFindTextNode(&vTree, p->children.values[0]);
    assertThatOrGoto(pText != NULL, done, "Should register <p>'s textNode");
    assertStrEquals(pText->chars, "bar");
    // div
    ElemNode *div = vTreeFindElemNodeByTagName(&vTree, "div");
    assertThatOrGoto(div != NULL, done, "Should register <div>");
    assertIntEqualsOrGoto(div->children.length, 2, done);
    assertThatOrGoto(vTreeFindElemNode(&vTree, div->children.values[0]) == h2,
                     done, "div.children[0] == h2");
    assertThatOrGoto(vTreeFindElemNode(&vTree, div->children.values[1]) == p,
                     done, "div.children[1] == p");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeDestruct(&vTree);
        documentDataConfigDestruct(&ddc);
}

void
testVTreeRegisterElementWithDataConfigChildren() {
    //
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    char *layout = "vTree.registerElement(\"div\", null, ["
        "vTree.registerElement(\"div\", null, "
            "documentDataConfig.renderOne(\"Article\")"
        "),"
        "vTree.registerElement(\"div\", null, "
            "documentDataConfig.renderOne(\"Generic\")"
        "),"
    "])";
    //
    bool success = vTreeScriptBindingsExecLayout(ctx, layout, &vTree, &ddc, errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch1 = &ddc.batches;
    assertThatOrGoto(actualBatch1->componentTypeName != NULL, done,
                     "Should populate the 1st batch");
    assertStrEquals(actualBatch1->componentTypeName, "Article");
    DataBatchConfig *actualBatch2 = actualBatch1->next;
    assertThatOrGoto(actualBatch2 != NULL, done, "Should add the second batch");
    assertThatOrGoto(actualBatch2->componentTypeName != NULL, done,
                     "Should populate the 2nd batch");
    assertStrEquals(actualBatch2->componentTypeName, "Generic");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeDestruct(&vTree);
        documentDataConfigDestruct(&ddc);
}

static void
testExecLayoutRunsMultipleLayoutsWithoutConflict() {
    // 1. Setup
    beforeEach();
    VTree vTree1;
    VTree vTree2;
    DocumentDataConfig ddc1;
    DocumentDataConfig ddc2;
    char *layout1 = "vTree.registerElement(\"div\", null, \"foo\")";
    char *layout2 = "vTree.registerElement(\"span\", null, \"bar\")";
    // 2. Evaluate two layouts and vTrees
    bool success1 = vTreeScriptBindingsExecLayout(ctx, layout1, &vTree1, &ddc1, errBuf);
    assertThatOrGoto(success1, done, "Should return successfully on layout1");
    bool success2 = vTreeScriptBindingsExecLayout(ctx, layout2, &vTree2, &ddc2, errBuf);
    assertThatOrGoto(success2, done, "Should return successfully on layout2");
    // 3. Assert that vTrees contain their own nodes only
    assertIntEqualsOrGoto(vTree1.elemNodes.length, 1, done);
    assertIntEqualsOrGoto(vTree2.elemNodes.length, 1, done);
    assertIntEqualsOrGoto(vTree1.textNodes.length, 1, done);
    assertIntEqualsOrGoto(vTree2.textNodes.length, 1, done);
    //
    ElemNode *div1 = vTreeFindElemNodeByTagName(&vTree1, "div");
    assertThatOrGoto(div1 != NULL, done, "Should register <div>");
    assertIntEqualsOrGoto(div1->children.length, 1, done);
    TextNode *div1Text = vTreeFindTextNode(&vTree1, div1->children.values[0]);
    assertThatOrGoto(div1Text != NULL, done, "Should register <div>'s textNode");
    assertStrEquals(div1Text->chars, "foo");
    //
    ElemNode *span2 = vTreeFindElemNodeByTagName(&vTree2, "span");
    assertThatOrGoto(span2 != NULL, done, "Should register <span>");
    assertIntEqualsOrGoto(span2->children.length, 1, done);
    TextNode *span2Text = vTreeFindTextNode(&vTree2, span2->children.values[0]);
    assertThatOrGoto(span2Text != NULL, done, "Should register <span>'s textNode");
    assertStrEquals(span2Text->chars, "bar");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeDestruct(&vTree1);
        vTreeDestruct(&vTree2);
        documentDataConfigDestruct(&ddc1);
        documentDataConfigDestruct(&ddc2);
}

void
testVTreeRegisterElementValidatesItsArguments() {
    //
    beforeEach();
    vTreeScriptBindingsRegister(ctx);
    VTree vTree1;
    VTree vTree2;
    VTree vTree3;
    DocumentDataConfig ddc1;
    DocumentDataConfig ddc2;
    DocumentDataConfig ddc3;
    char *layout = "vTree.registerElement()";
    char *layout2 = "vTree.registerElement(\"p\", null, true)";
    char *layout3 = "vTree.registerElement(\"p\", null, [])";
    //
    bool success1 = vTreeScriptBindingsExecLayout(ctx, layout, &vTree1, &ddc1, errBuf);
    assertThatOrGoto(!success1, done, "Should return false");
    assertStrEquals(errBuf, "TypeError: string required, found undefined (stack index 0)");
    //
    bool success2 = vTreeScriptBindingsExecLayout(ctx, layout2, &vTree2, &ddc2, errBuf);
    assertThatOrGoto(!success2, done, "Should return false");
    assertStrEquals(errBuf, "TypeError: 3rd arg must be \"str\", <nodeRef>, [<n"
                            "odeRef>..], <dataConfig> or [<dataConfig>...].\n");
    //
    bool success3 = vTreeScriptBindingsExecLayout(ctx, layout3, &vTree3, &ddc3, errBuf);
    assertThatOrGoto(!success3, done, "Should return false");
    assertStrEquals(errBuf, "TypeError: Child-array can't be empty.\n");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeDestruct(&vTree1);
        vTreeDestruct(&vTree2);
        vTreeDestruct(&vTree3);
        documentDataConfigDestruct(&ddc1);
        documentDataConfigDestruct(&ddc2);
        documentDataConfigDestruct(&ddc3);
}

void
vTreeScriptBindingsTestsRun() {
    testExecLayoutConfiguresGlobalScope();
    testVTreeRegisterElementWithElemAndTextChildren();
    testVTreeRegisterElementWithDataConfigChildren();
    testExecLayoutRunsMultipleLayoutsWithoutConflict();
    testVTreeRegisterElementValidatesItsArguments();
}
