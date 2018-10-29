#include "v-tree-script-bindings-tests.h"

static void
populateComponent(unsigned id, const char *name, const char *json,
                  unsigned dbcId, Component *out);

#define beforeEach() \
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0'; \
    duk_context *ctx = myDukCreate(errBuf); \
    if (!ctx) { printToStdErr("Failed to create duk_context\n"); exit(EXIT_FAILURE); } \
    vTreeScriptBindingsRegister(ctx); \
    dataQueryScriptBindingsRegister(ctx)

static void
testExecLayoutPassesCorrectArguments() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    // 2. Call
    char *myLayout = "function (vTree, documentDataConfig) {"
                         "vTree !== undefined; documentDataConfig !== undefined;"
                     "}";
    bool success = vTreeScriptBindingsCompileAndExecLayout(ctx, myLayout,
        &vTree, &ddc, "/", errBuf);
    // 3. Assert
    assertThat(success, "Should return succesfully");
    //
    duk_destroy_heap(ctx);
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
}

static void
testVTreeRegisterElementWithElemAndTextChildren() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    // 2. Call
    char *myLayout = "function (vTree, _) {"
            "vTree.registerElement('div', null, ["               // multiple nodes as children
                "vTree.registerElement('h2', null,"              // single node as a children
                    "vTree.registerElement('span', null, 'foo')" // text as a children
                "),"
                "vTree.registerElement('p', null, 'bar')"
            "]);"
        "}";
    bool success = vTreeScriptBindingsCompileAndExecLayout(ctx, myLayout,
        &vTree, &ddc, "/", errBuf);
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
        vTreeFreeProps(&vTree);
        documentDataConfigFreeProps(&ddc);
}

void
testVTreeRegisterElementWithDataConfigChildren() {
    //
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    char *layout = "function (vTree, documentDataConfig) {"
        "vTree.registerElement('div', null, ["
            "vTree.registerElement('div', null, "
                "documentDataConfig.renderOne('Article')" // single dbc as a children
            "),"
            "vTree.registerElement('div', null, ["        // multiple dbc's as children
                "documentDataConfig.renderOne('Aa'),"
                "documentDataConfig.renderOne('Bb')"
            "]),"
        "]);"
    "}";
    //
    bool success = vTreeScriptBindingsCompileAndExecLayout(ctx, layout, &vTree,
        &ddc, "/", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch1 = &ddc.batches;
    assertThatOrGoto(actualBatch1->componentTypeName != NULL, done,
                     "Should populate the 1st batch");
    assertStrEquals(actualBatch1->componentTypeName, "Article");
    DataBatchConfig *actualBatch2 = actualBatch1->next;
    assertThatOrGoto(actualBatch2 != NULL, done, "Should add the second batch");
    assertThatOrGoto(actualBatch2->componentTypeName != NULL, done,
                     "Should populate the 2nd batch");
    assertStrEquals(actualBatch2->componentTypeName, "Aa");
    DataBatchConfig *actualBatch3 = actualBatch2->next;
    assertThatOrGoto(actualBatch3 != NULL, done, "Should add the third batch");
    assertThatOrGoto(actualBatch3->componentTypeName != NULL, done,
                     "Should populate the 3nd batch");
    assertStrEquals(actualBatch3->componentTypeName, "Bb");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
        documentDataConfigFreeProps(&ddc);
}

void
testVTreeRegisterElementWithMixedChildren() {
    //
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    char *layout = "function (vTree, documentDataConfig) {"
        "vTree.registerElement('div', null, ["
            "documentDataConfig.renderOne('Aa'),"
            "vTree.registerElement('p', null, 'foo')"
        "]);"
    "}";
    //
    bool success = vTreeScriptBindingsCompileAndExecLayout(ctx, layout, &vTree,
        &ddc, "/", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch = &ddc.batches;
    assertThatOrGoto(actualBatch->componentTypeName != NULL, done,
                     "Should populate the 1st batch");
    assertStrEquals(actualBatch->componentTypeName, "Aa");
    //
    ElemNode *p = vTreeFindElemNodeByTagName(&vTree, "p");
    assertThatOrGoto(p != NULL, done, "Should register [..., <p>]");
    assertIntEqualsOrGoto(p->children.length, 1, done);
    TextNode *pText = vTreeFindTextNode(&vTree, p->children.values[0]);
    assertThatOrGoto(pText != NULL, done, "Should register <p>'s textNode");
    assertStrEquals(pText->chars, "foo");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
        documentDataConfigFreeProps(&ddc);
}

void
testDocumentDataConfigRenderOneChains() {
    //
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    char *layout = "function (vTree) {"
        "vTree.registerElement('div', null, "
            "documentDataConfig.renderOne('Foo').using('a.tmpl').where('bar=1')"
        ");"
    "}";
    //
    bool success = vTreeScriptBindingsCompileAndExecLayout(ctx, layout, &vTree,
        &ddc, "/", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch = &ddc.batches;
    assertThatOrGoto(actualBatch->componentTypeName != NULL, done,
                     "componentTypeName != NULL");
    assertStrEquals(actualBatch->componentTypeName, "Foo");
    assertThatOrGoto(actualBatch->renderWith != NULL, done,
                     "renderWith != NULL");
    assertStrEquals(actualBatch->renderWith, "a.tmpl");
    assertThatOrGoto(actualBatch->where != NULL, done,
                     "where != NULL");
    assertStrEquals(actualBatch->where, "bar=1");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
        documentDataConfigFreeProps(&ddc);
}

void
testDocumentDataConfigRenderAllChains() {
    //
    beforeEach();
    VTree vTree;
    DocumentDataConfig ddc;
    char *layout = "function (vTree) {"
        "vTree.registerElement('div', null, "
            "documentDataConfig.renderAll('Bar').using('b.tmpl')"
        ");"
    "}";
    //
    bool success = vTreeScriptBindingsCompileAndExecLayout(ctx, layout, &vTree,
        &ddc, "/", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch = &ddc.batches;
    assertThatOrGoto(actualBatch->componentTypeName != NULL, done,
                     "componentTypeName != NULL");
    assertStrEquals(actualBatch->componentTypeName, "Bar");
    assertThatOrGoto(actualBatch->renderWith != NULL, done,
                     "renderWith != NULL");
    assertStrEquals(actualBatch->renderWith, "b.tmpl");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
        documentDataConfigFreeProps(&ddc);
}

static void
testExecLayoutRunsMultipleLayoutsWithoutConflict() {
    // 1. Setup
    beforeEach();
    VTree vTree1;
    VTree vTree2;
    DocumentDataConfig ddc1;
    DocumentDataConfig ddc2;
    char *layout1 = "function (vTree, _) {"
        " vTree.registerElement('div', null, 'foo');"
    "}";
    char *layout2 = "function (vTree, _) {"
        " vTree.registerElement('span', null, 'bar');"
    "}";
    // 2. Evaluate two layouts and vTrees
    bool success1 = vTreeScriptBindingsCompileAndExecLayout(ctx, layout1,
        &vTree1, &ddc1, "/", errBuf);
    assertThatOrGoto(success1, done, "Should return successfully on layout1");
    bool success2 = vTreeScriptBindingsCompileAndExecLayout(ctx, layout2,
        &vTree2, &ddc2, "/", errBuf);
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
        vTreeFreeProps(&vTree1);
        vTreeFreeProps(&vTree2);
        documentDataConfigFreeProps(&ddc1);
        documentDataConfigFreeProps(&ddc2);
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
    char *layout = "function (vTree, _) {"
        " vTree.registerElement();"
    "}";
    char *layout2 = "function (vTree, _) {"
        " vTree.registerElement('p', null, true);"
    "}";
    char *layout3 = "function (vTree, _) {"
        " vTree.registerElement('p', null, []);"
    "}";
    //
    bool success1 = vTreeScriptBindingsCompileAndExecLayout(ctx, layout,
        &vTree1, &ddc1, "/", errBuf);
    assertThatOrGoto(!success1, done, "Should return false");
    assertStrEquals(errBuf, "TypeError: string required, found undefined (stack index 0)");
    //
    bool success2 = vTreeScriptBindingsCompileAndExecLayout(ctx, layout2,
        &vTree2, &ddc2, "/", errBuf);
    assertThatOrGoto(!success2, done, "Should return false");
    assertStrEquals(errBuf, "TypeError: 3rd arg must be \"str\", <nodeRef>, "
                    "<dataConfig>, or [<nodeRef>|<dataConfig>...].\n");
    //
    bool success3 = vTreeScriptBindingsCompileAndExecLayout(ctx, layout3,
        &vTree3, &ddc3, "/", errBuf);
    assertThatOrGoto(!success3, done, "Should return false");
    assertStrEquals(errBuf, "TypeError: Child-array can't be empty.\n");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree1);
        vTreeFreeProps(&vTree2);
        vTreeFreeProps(&vTree3);
        documentDataConfigFreeProps(&ddc1);
        documentDataConfigFreeProps(&ddc2);
        documentDataConfigFreeProps(&ddc3);
}

static void
testExecRenderOneTemplatePassesCorrectArguments() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    ComponentArray cmps;
    componentArrayInit(&cmps);
    DataBatchConfig dbcOfThisTemplate;
    dbcOfThisTemplate.id = 3;
    unsigned dbcIdOfSomeOtherBatch = 453;
    Component tmplComponent;
    Component someOtherComponent;
    populateComponent(1, "foo", "{\"prop\":2}", dbcOfThisTemplate.id, &tmplComponent);
    populateComponent(2, "bar", "{\"fus\":45}", dbcIdOfSomeOtherBatch, &someOtherComponent);
    componentArrayPush(&cmps, &tmplComponent);
    componentArrayPush(&cmps, &someOtherComponent);
    // 2. Call
    char *myTemplate = "function (vTree, cmp) {"
                           "vTree.registerElement(\"fos\", null, "
                               "cmp.id + ' ' + cmp.name + ' ' + cmp.data.prop"
                           ")"
                       "}";
    bool isRenderAll = false;
    unsigned nodeId = vTreeScriptBindingsCompileAndExecTemplate(ctx, myTemplate,
        &vTree, &dbcOfThisTemplate, &cmps, isRenderAll, "/", errBuf);
    // 3. Assert
    assertThatOrGoto(nodeId == 1, done, "Should return the id of the root node");
    assertStrEquals(vTree.textNodes.values[0].chars, "1 foo 2");
    //
    done:
    duk_destroy_heap(ctx);
    vTreeFreeProps(&vTree);
    componentArrayFreeProps(&cmps);
}

static void
testExecRenderAllTemplatePassesCorrectArguments() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    ComponentArray cmps;
    componentArrayInit(&cmps);
    DataBatchConfig dbcOfThisTemplate;
    dbcOfThisTemplate.id = 3;
    unsigned dbcIdOfSomeOtherBatch = 453;
    Component tmplComponent1;
    Component tmplComponent2;
    Component someOtherComponent;
    populateComponent(1, "foo", "{\"prop\":2}", dbcOfThisTemplate.id, &tmplComponent1);
    populateComponent(2, "bar", "{\"prop\":3}", dbcOfThisTemplate.id, &tmplComponent2);
    populateComponent(3, "baz", "{\"fus\":45}", dbcIdOfSomeOtherBatch, &someOtherComponent);
    componentArrayPush(&cmps, &tmplComponent1);
    componentArrayPush(&cmps, &someOtherComponent);
    componentArrayPush(&cmps, &tmplComponent2);
    // 2. Call
    char *myTemplate = "function (vTree, cmps) {"
                           "vTree.registerElement(\"fos\", null, "
                               "cmps.map(function (cmp) {"
                                  "return cmp.id + ' ' + cmp.name + ' ' + "
                                          "cmp.data.prop"
                               "}).join(', ')"
                           ")"
                       "}";
    bool isRenderAll = true;
    unsigned nodeId = vTreeScriptBindingsCompileAndExecTemplate(ctx, myTemplate,
        &vTree, &dbcOfThisTemplate, &cmps, isRenderAll, "/", errBuf);
    // 3. Assert
    assertThatOrGoto(nodeId == 1, done, "Should return the id of the root node");
    assertStrEquals(vTree.textNodes.values[0].chars, "1 foo 2, 2 bar 3");
    //
    done:
    duk_destroy_heap(ctx);
    vTreeFreeProps(&vTree);
    componentArrayFreeProps(&cmps);
}

void
vTreeScriptBindingsTestsRun() {
    testExecLayoutPassesCorrectArguments();
    testVTreeRegisterElementWithElemAndTextChildren();
    testVTreeRegisterElementWithDataConfigChildren();
    testVTreeRegisterElementWithMixedChildren();
    testDocumentDataConfigRenderOneChains();
    testDocumentDataConfigRenderAllChains();
    testExecLayoutRunsMultipleLayoutsWithoutConflict();
    testVTreeRegisterElementValidatesItsArguments();
    testExecRenderOneTemplatePassesCorrectArguments();
    testExecRenderAllTemplatePassesCorrectArguments();
}

static void
populateComponent(unsigned id, const char *name, const char *json,
                  unsigned dbcId, Component *out) {
    componentInit(out);
    out->id = id;
    out->name = copyString(name);
    out->json = copyString(json);
    out->dataBatchConfigId = dbcId;
}
