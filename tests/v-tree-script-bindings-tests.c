#include "v-tree-script-bindings-tests.h"

static void
populateComponent(unsigned id, const char *name, const char *json,
                  unsigned dbcId, Component *out);

#define beforeEach() \
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0'; \
    duk_context *ctx = myDukCreate(errBuf); \
    ASSERT(ctx != NULL, "Failed to create duk_context\n"); \
    vTreeScriptBindingsRegister(ctx); \
    dataDefScriptBindingsRegister(ctx, errBuf); \
    dataQueryScriptBindingsRegister(ctx)

static void
testVTreeRegisterElementWithElemAndTextChildren() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    // 2. Call
    char *layoutTmpl = "function (vTree) {"
            "vTree.registerElement('div', null, ["               // multiple nodes as children
                "vTree.registerElement('h2', null,"              // single node as a children
                    "vTree.registerElement('span', null, 'foo')" // text as a children
                "),"
                "vTree.registerElement('p', null, 'bar')"
            "]);"
        "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, NULL, NULL, "", errBuf);
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
}

static void
testVTreeRegisterElementAttributes() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    // 2. Call
    char *layoutTmpl = "function (vTree) {"
            "vTree.registerElement('div', {foo: 'bar'}, "
                "vTree.registerElement('div', {baz: 'naz', gas: 'maz foo'}, 'Foo')"
            ")"
        "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, NULL, NULL, "", errBuf);
    // 3. Assert
    assertThatOrGoto(success, done, "Should return succesfully");
    assertThatOrGoto(vTree.elemNodes.length==2, done, "Sanity elemNodes.length==2");
    // inner div (2 attrs)
    ElemNode *innerDiv = &vTree.elemNodes.values[0];
    assertThatOrGoto(innerDiv != NULL, done, "Sanity innerDiv != NULL");
    assertThatOrGoto(innerDiv->props != NULL, done, "Should set inner's first attribute");
    assertThatOrGoto(innerDiv->props->key != NULL, done, "Should set innerDiv.props[0].key");
    assertStrEquals(innerDiv->props->key, "baz");
    assertThatOrGoto(innerDiv->props->val != NULL, done, "Should set innerDiv.props[0].val");
    assertStrEquals(innerDiv->props->val, "naz");
    ElemProp *secondProp = innerDiv->props->next;
    assertThatOrGoto(secondProp != NULL, done, "Should set inner's second attribute");
    assertThatOrGoto(secondProp->key != NULL, done, "Should set innerDiv.props[1].key");
    assertStrEquals(secondProp->key, "gas");
    assertThatOrGoto(secondProp->val != NULL, done, "Should set innerDiv.props[1].val");
    assertStrEquals(secondProp->val, "maz foo");
    // outer div (1 attr)
    ElemNode *outerDiv = &vTree.elemNodes.values[1];
    assertThatOrGoto(outerDiv != NULL, done, "Sanity outerDiv != NULL");
    assertThatOrGoto(outerDiv->props != NULL, done, "Should set outer's attribute");
    assertThatOrGoto(outerDiv->props->key != NULL, done, "Should set outerDiv.props[0].key");
    assertStrEquals(outerDiv->props->key, "foo");
    assertThatOrGoto(outerDiv->props->val != NULL, done, "Should set outerDiv.props[0].val");
    assertStrEquals(outerDiv->props->val, "bar");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
}

static void
testVTreeRegisterElementValidatesItsArguments() {
    //
    beforeEach();
    VTree vTree1;
    VTree vTree2;
    VTree vTree3;
    vTreeInit(&vTree1);
    vTreeInit(&vTree2);
    vTreeInit(&vTree3);
    char *layoutTmpl1 = "function (vTree, _) {"
        " vTree.registerElement();"
    "}";
    char *layoutTmpl2 = "function (vTree, _) {"
        " vTree.registerElement('p', null, true);"
    "}";
    char *layoutTmpl3 = "function (vTree, _) {"
        " vTree.registerElement('p', null, []);"
    "}";
    //
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl1, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success1 = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree1, NULL, NULL,
                                                      "foo", errBuf);
    assertThatOrGoto(!success1, done, "Should return false");
    assertThat(strstr(errBuf, "registerElement expects exactly 3 arguments") != NULL,
                      "Should whine about wrong arg-count");
    //
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl2, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success2 = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree2, NULL, NULL, "", errBuf);
    assertThatOrGoto(!success2, done, "Should return false");
    assertThat(strstr(errBuf, "3rd arg must be \"str\", <nodeRef>, or [<nodeRef>...]") != NULL,
                      "Should whine about wrong 3rd. arg");
    //
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl3, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success3 = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree3, NULL, NULL, "", errBuf);
    assertThatOrGoto(!success3, done, "Should return false");
    assertThat(strstr(errBuf, "Child-array can't be empty") != NULL,
                      "Should whine about empty child-array");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree1);
        vTreeFreeProps(&vTree2);
        vTreeFreeProps(&vTree3);
}

static void
testVTreePartialRunsCachedPartial() {
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    const char *testPartial = "function(vTree,d) {"
        "return vTree.registerElement('div', null, d.foo)"
    "}";
    if (!testUtilsCompileAndCache(ctx, testPartial, "foo.js", errBuf)) {
        printToStdErr("%s", errBuf); goto done;
    }
    //
    char *layoutTmpl = "function (vTree) {"
        "vTree.registerElement('div', null, vTree.partial('foo.js', {foo:'bar'}));"
    "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, NULL, NULL, "", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully.");
    assertIntEqualsOrGoto(vTree.elemNodes.length, 2, done);
    ElemNode *partialRoot = &vTree.elemNodes.values[0];
    assertIntEqualsOrGoto(partialRoot->children.length, 1, done);
    TextNode *partialRootText = vTreeFindTextNode(&vTree, partialRoot->children.values[0]);
    assertThatOrGoto(partialRootText != NULL && partialRootText->chars != NULL,
                     done, "Sanity partialRoot.text != NULL");
    assertStrEquals(partialRootText->chars, "bar");
    assertThatOrGoto(vTree.elemNodes.values[1].children.length == 1, done,
        "Sanity elems[1].children.length == 1");
    assertIntEquals(vTree.elemNodes.values[1].children.values[0],
        vTreeUtilsMakeNodeRef(TYPE_ELEM, partialRoot->id));
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
}

static void
testDocumentDataConfigFetchOneChains() {
    //
    beforeEach();
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char *layoutWrap = "function (documentDataConfig) {"
        "documentDataConfig.fetchOne('Foo').where('bar=1').to('varname');"
        "return function(){};"
    "}";
    //
    bool success = vTreeScriptBindingsCompileAndExecLayoutWrap(ctx, layoutWrap,
        &ddc, "/", "", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch = &ddc.batches;
    assertThatOrGoto(actualBatch->componentTypeName != NULL, done,
                     "componentTypeName != NULL");
    assertStrEquals(actualBatch->componentTypeName, "Foo");
    assertThatOrGoto(actualBatch->tmplVarName != NULL, done,
                     "tmplVarName != NULL");
    assertStrEquals(actualBatch->tmplVarName, "varname");
    assertThatOrGoto(actualBatch->where != NULL, done,
                     "where != NULL");
    assertStrEquals(actualBatch->where, "bar=1");
    //
    done:
        duk_destroy_heap(ctx);
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataConfigFetchAllChains() {
    //
    beforeEach();
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char *layoutWrap = "function (documentDataConfig) {"
        "documentDataConfig.fetchAll('Bar').to('myVar');"
        "return function(){};"
    "}";
    //
    bool success = vTreeScriptBindingsCompileAndExecLayoutWrap(ctx, layoutWrap,
        &ddc, "/", "", errBuf);
    assertThatOrGoto(success, done, "Should return succesfully");
    DataBatchConfig *actualBatch = &ddc.batches;
    assertThatOrGoto(actualBatch->componentTypeName != NULL, done,
                     "componentTypeName != NULL");
    assertStrEquals(actualBatch->componentTypeName, "Bar");
    assertThatOrGoto(actualBatch->tmplVarName != NULL, done,
                     "tmplVarName != NULL");
    assertStrEquals(actualBatch->tmplVarName, "myVar");
    //
    done:
        duk_destroy_heap(ctx);
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataConfigFetchOneValidatesItsArguments() {
    //
    beforeEach();
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    const char *bogusLayoutWrap = "function (documentDataConfig) {"
        "try { documentDataConfig.fetchOne('foo')._validate(); } catch (e) {}"
        "documentDataConfig.fetchOne('-'.repeat(65));"
        "return function(){};"
    "}";
    //
    bool success1 = vTreeScriptBindingsCompileAndExecLayoutWrap(ctx,
        bogusLayoutWrap, &ddc, "/", "", errBuf);
    assertThatOrGoto(!success1, done, "Should fail");
    DataBatchConfig *firstBatch = &ddc.batches;
    assertThat(hasFlag(firstBatch->errors, DBC_WHERE_REQUIRED),
               "Should set DBC_WHERE_REQUIRED");
    assertThatOrGoto(firstBatch->next != NULL, done, "Sanity firstBatch->next != NULL");
    DataBatchConfig *secondBatch = firstBatch->next;
    assertThat(hasFlag(secondBatch->errors, DBC_CMP_TYPE_NAME_TOO_LONG),
               "Should set DBC_CMP_TYPE_NAME_TOO_LONG");
    //
    done:
        duk_destroy_heap(ctx);
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataConfigFetchAllValidatesItsArguments() {
    //
    beforeEach();
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char *tooLongCmpTypeName = "function (documentDataConfig) {"
        "documentDataConfig.fetchAll('-'.repeat(65));"
        "return function(){};"
    "}";
    //
    bool success1 = vTreeScriptBindingsCompileAndExecLayoutWrap(ctx,
        tooLongCmpTypeName, &ddc, "/", "", errBuf);
    assertThatOrGoto(!success1, done, "Should fail");
    DataBatchConfig *firstBatch = &ddc.batches;
    assertThat(hasFlag(firstBatch->errors, DBC_CMP_TYPE_NAME_TOO_LONG),
               "Should set DBC_WHERE_REQUIRED");
    //
    done:
        duk_destroy_heap(ctx);
        documentDataConfigFreeProps(&ddc);
}

static void
testExecLayoutRunsMultipleLayoutsWithoutConflict() {
    // 1. Setup
    beforeEach();
    VTree vTree1;
    VTree vTree2;
    vTreeInit(&vTree1);
    vTreeInit(&vTree2);
    char *layoutTmpl1 = "function (vTree) {"
        " vTree.registerElement('div', null, 'foo');"
    "}";
    char *layoutTmpl2 = "function (vTree) {"
        " vTree.registerElement('span', null, 'bar');"
    "}";
    // 2. Evaluate two layouts and vTrees
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl1, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success1 = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree1, NULL, NULL, "", errBuf);
    assertThatOrGoto(success1, done, "Should return successfully on layout1");
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl2, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success2 = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree2, NULL, NULL, "", errBuf);
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
}

static void
testExecLayoutTmplProvidesFetchOnesInVariables() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    ComponentArray cmps;
    componentArrayInit(&cmps);
    bool isFetchAll = false;
    DataBatchConfig *dbc1 = documentDataConfigAddBatch(&ddc, "Foo", isFetchAll);
    dataBatchConfigSetWhere(dbc1, "gos=foo");
    dataBatchConfigSetTmplVarName(dbc1, "var1");
    DataBatchConfig *dbc2 = documentDataConfigAddBatch(&ddc, "Foo", isFetchAll);
    dataBatchConfigSetWhere(dbc2, "gos=bar");
    dataBatchConfigSetTmplVarName(dbc2, "var2");
    //
    Component component1;
    Component component2;
    populateComponent(1, "foo", "{\"prop\":2.5}", dbc1->id, &component1);
    populateComponent(2, "bar", "{\"fus\":4.5}", dbc2->id, &component2);
    componentArrayPush(&cmps, &component1);
    componentArrayPush(&cmps, &component2);
    // 2. Call
    char *layoutTmpl = "function (vTree, pageData, var1, var2) {"
                           "vTree.registerElement('fos', null, "
                               "var1.prop + ' ' + var1.cmp.id + ' ' + var1.cmp.name + ' | ' +"
                               "var2.fus + ' ' + var2.cmp.id + ' ' + var2.cmp.name"
                           ")"
                       "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, &ddc.batches,
                                                     &cmps, "", errBuf);
    // 3. Assert
    assertThatOrGoto(success, done, "Should return succesfully");
    assertThatOrGoto(vTree.textNodes.length == 1, done,
        "Sanity textNodes.length==1");
    assertThatOrGoto(vTree.textNodes.values[0].chars!=NULL, done,
        "Sanity textNodes[0].chars!=NULL");
    assertStrEquals(vTree.textNodes.values[0].chars, "2.5 1 foo | 4.5 2 bar");
    //
    done:
    duk_destroy_heap(ctx);
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    componentArrayFreeProps(&cmps);
}

static void
testExecLayoutTmplProvidesFetchAllsInVariables() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    ComponentArray cmps;
    componentArrayInit(&cmps);
    bool isFetchAll = true;
    DataBatchConfig *dbc1 = documentDataConfigAddBatch(&ddc, "Foo", isFetchAll);
    dataBatchConfigSetTmplVarName(dbc1, "foos");
    DataBatchConfig *dbc2 = documentDataConfigAddBatch(&ddc, "Bar", isFetchAll);
    dataBatchConfigSetTmplVarName(dbc2, "bars");
    //
    Component foo1;
    Component foo2;
    Component bar1;
    Component bar2;
    populateComponent(1, "foo", "{\"prop\":5.5}", dbc1->id, &foo1);
    populateComponent(2, "bar", "{\"prop\":6.6}", dbc1->id, &foo2);
    populateComponent(3, "baz", "{\"fus\":7.7}", dbc2->id, &bar1);
    populateComponent(4, "naz", "{\"fus\":8.8}", dbc2->id, &bar2);
    componentArrayPush(&cmps, &foo1);
    componentArrayPush(&cmps, &foo2);
    componentArrayPush(&cmps, &bar1);
    componentArrayPush(&cmps, &bar2);
    // 2. Call
    char *layoutTmpl = "function (vTree, pageData, foos, bars) {"
                           "vTree.registerElement('fos', null, "
                               "foos.map(function (foo) {"
                                  "return foo.prop + ' ' + foo.cmp.id + ' ' + "
                                          "foo.cmp.name"
                               "}).join(', ') + ' | ' +"
                               "bars.map(function (bar) {"
                                  "return bar.fus + ' ' + bar.cmp.id + ' ' + "
                                          "bar.cmp.name"
                               "}).join(', ')"
                           ")"
                       "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, &ddc.batches,
                                                     &cmps, "", errBuf);
    // 3. Assert
    assertThatOrGoto(success, done, "Should return succesfully");
    assertThatOrGoto(vTree.textNodes.length == 1, done,
        "Sanity textNodes.length==1");
    assertThatOrGoto(vTree.textNodes.values[0].chars!=NULL, done,
        "Sanity textNodes[0].chars!=NULL");
    assertStrEquals(vTree.textNodes.values[0].chars,
        "5.5 1 foo, 6.6 2 bar | 7.7 3 baz, 8.8 4 naz");
    //
    done:
    duk_destroy_heap(ctx);
    vTreeFreeProps(&vTree);
    documentDataConfigFreeProps(&ddc);
    componentArrayFreeProps(&cmps);
}

void
vTreeScriptBindingsTestsRun() {
    testVTreeRegisterElementWithElemAndTextChildren();
    testVTreeRegisterElementAttributes();
    testVTreeRegisterElementValidatesItsArguments();
    testVTreePartialRunsCachedPartial();
    testDocumentDataConfigFetchOneChains();
    testDocumentDataConfigFetchAllChains();
    testDocumentDataConfigFetchOneValidatesItsArguments();
    testDocumentDataConfigFetchAllValidatesItsArguments();
    testExecLayoutRunsMultipleLayoutsWithoutConflict();
    testExecLayoutTmplProvidesFetchOnesInVariables();
    testExecLayoutTmplProvidesFetchAllsInVariables();
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

#undef beforeEach
