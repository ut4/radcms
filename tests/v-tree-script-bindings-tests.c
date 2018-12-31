#include "v-tree-script-bindings-tests.h"

#define beforeEach() \
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0'; \
    duk_context *ctx = myDukCreate(errBuf); \
    ASSERT(ctx != NULL, "Failed to create duk_context\n"); \
    commonScriptBindingsInit(ctx, NULL, errBuf); \
    vTreeScriptBindingsInit(ctx); \
    websiteScriptBindingsInit(ctx, NULL, errBuf); \
    dataQueryScriptBindingsInit(ctx)

static void
testVTreeRegisterElementWithElemAndTextChildren() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    // 2. Call
    char *layoutTmpl = "function (vTree) {"
            "vTree.createElement('div', null, ["               // multiple nodes as children
                "vTree.createElement('h2', null,"              // single node as a children
                    "vTree.createElement('span', null, 'foo')" // text as a children
                "),"
                "vTree.createElement('p', null, 'bar')"
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
testVTreeRegisterElementFlattensNestedArrays() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    // 2. Call
    char *layoutTmpl = "function (vTree) {"
            "vTree.createElement('ul', null, [' a ', ["
                "vTree.createElement('li', null, 'li1'),"
                "vTree.createElement('li', null, 'li2')"
            "], ' b ']);"
        "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, NULL, NULL, "", errBuf);
    // 3. Assert
    assertThatOrGoto(success, done, "Should return succesfully");
    assertIntEqualsOrGoto(vTree.elemNodes.length, 3, done);
    assertIntEqualsOrGoto(vTree.textNodes.length, 4, done);
    // ul
    ElemNode *ul = vTreeFindElemNodeByTagName(&vTree, "ul");
    assertThatOrGoto(ul != NULL, done, "Sanity <ul> != NULL");
    assertIntEqualsOrGoto(ul->children.length, 4, done);
    // #1
    TextNode *a = vTreeFindTextNode(&vTree, ul->children.values[0]);
    assertThatOrGoto(a != NULL, done, "Should set <ul>'s #1 child");
    assertStrEquals(a->chars, " a ");
    // #2
    ElemNode *b = vTreeFindElemNode(&vTree, ul->children.values[1]);
    assertThatOrGoto(b != NULL, done, "Should set <ul>'s #2 child");
    assertThatOrGoto(vTreeFindTextNode(&vTree, b->children.values[0]) != NULL,
                     done, "Sanity li#1->textContent ! NULL");
    assertStrEquals(vTreeFindTextNode(&vTree, b->children.values[0])->chars, "li1");
    // #3
    ElemNode *c = vTreeFindElemNode(&vTree, ul->children.values[2]);
    assertThatOrGoto(c != NULL, done, "Should set <ul>'s #3 child");
    assertThatOrGoto(vTreeFindTextNode(&vTree, c->children.values[0]) != NULL,
                     done, "Sanity li#2->textContent ! NULL");
    assertStrEquals(vTreeFindTextNode(&vTree, c->children.values[0])->chars, "li2");
    // #4
    TextNode *d = vTreeFindTextNode(&vTree, ul->children.values[3]);
    assertThatOrGoto(d != NULL, done, "Should set <ul>'s #4 child");
    assertStrEquals(d->chars, " b ");
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
            "vTree.createElement('div', {foo: 'bar'}, "
                "vTree.createElement('div', {baz: 'naz', gas: 'maz foo'}, 'Foo')"
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
testVTreeRegisterElementToleratesNonStringAttributes() {
    // 1. Setup
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    // 2. Call
    char *layoutTmpl = "function (vTree) {"
            "vTree.createElement('div', {foo: null, bar: undefined}, '')"
        "}";
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree, NULL, NULL, "", errBuf);
    // 3. Assert
    assertThatOrGoto(success, done, "Should return succesfully");
    assertIntEqualsOrGoto(vTree.elemNodes.length, 1, done);
    //
    ElemProp *prop = vTree.elemNodes.values[0].props;
    assertThatOrGoto(prop != NULL, done, "Should set attribute #1");
    assertThatOrGoto(prop->val != NULL, done, "Should set attribute #1 value");
    assertStrEquals(prop->val, "null");
    //
    ElemProp *prop2 = prop->next;
    assertThatOrGoto(prop2 != NULL, done, "Should set attribute #2");
    assertThatOrGoto(prop2->val != NULL, done, "Should set attribute #2 value");
    assertStrEquals(prop2->val, "undefined");
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree);
}

static void
testVTreeRegisterElementValidatesItsArguments() {
    //
    beforeEach();
    VTree vTree1; vTreeInit(&vTree1);
    VTree vTree2; vTreeInit(&vTree2);
    VTree vTree3; vTreeInit(&vTree3);
    VTree vTree4; vTreeInit(&vTree4);
    VTree vTree5; vTreeInit(&vTree5);
    char *layoutTmpl1 = "function (vTree, _) {"
        " vTree.createElement();"
    "}";
    char *layoutTmpl2 = "function (vTree, _) {"
        " vTree.createElement('p', null, []);"
    "}";
    char *layoutTmpl3 = "function (vTree, _) {"
        " vTree.createElement('p', null, null);"
    "}";
    char *layoutTmpl4 = "function (vTree, _) {"
        " vTree.createElement('p', null, undefined);"
    "}";
    char *layoutTmpl5 = "function (vTree, _) {"
        " vTree.createElement('p', null, true);"
    "}";
    //
    if (!dukUtilsCompileStrToFn(ctx, layoutTmpl1, "l", errBuf)) {
        printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
    bool success1 = vTreeScriptBindingsExecLayoutTmpl(ctx, &vTree1, NULL, NULL,
                                                      "foo", errBuf);
    assertThatOrGoto(!success1, done, "Should return false");
    assertThat(strstr(errBuf, "createElement expects exactly 3 arguments") != NULL,
                      "Should whine about wrong arg-count");
    //
    const char* tmpls[] = {layoutTmpl2, layoutTmpl3, layoutTmpl4, layoutTmpl5};
    const char* expected[] = {"", "null", "undefined", "true"};
    VTree* trees[] = {&vTree2, &vTree3, &vTree4, &vTree5};
    for (unsigned i = 0; i < sizeof(tmpls) / sizeof(const char*); ++i) {
        if (!dukUtilsCompileStrToFn(ctx, tmpls[i], "l", errBuf)) {
            printToStdErr("Failed to compile test script: %s", errBuf); goto done; }
        bool success = vTreeScriptBindingsExecLayoutTmpl(ctx, trees[i], NULL, NULL, "", errBuf);
        assertThatOrGoto(success, done, "Should return true");
        ElemNode *p = vTreeFindElemNodeByTagName(trees[i], "p");
        assertThatOrGoto(p != NULL, done, "Sanity <p> != NULL");
        TextNode *pText = vTreeFindTextNode(trees[i], p->children.values[0]);
        assertThatOrGoto(pText != NULL, done, "Sanity <p> text != NULL");
        assertStrEquals(pText->chars, expected[i]);
    }
    //
    done:
        duk_destroy_heap(ctx);
        vTreeFreeProps(&vTree1);
        vTreeFreeProps(&vTree2);
        vTreeFreeProps(&vTree3);
        vTreeFreeProps(&vTree4);
        vTreeFreeProps(&vTree5);
}

static void
testVTreePartialRunsCachedPartial() {
    beforeEach();
    VTree vTree;
    vTreeInit(&vTree);
    const char *testPartial = "function(vTree,d) {"
        "return vTree.createElement('div', null, d.foo)"
    "}";
    if (!testUtilsCompileAndCache(ctx, testPartial, "foo.js", errBuf)) {
        printToStdErr("%s", errBuf); goto done;
    }
    //
    char *layoutTmpl = "function (vTree) {"
        "vTree.createElement('div', null, vTree.partial('foo.js', {foo:'bar'}));"
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
        " vTree.createElement('div', null, 'foo');"
    "}";
    char *layoutTmpl2 = "function (vTree) {"
        " vTree.createElement('span', null, 'bar');"
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
    componentArrayPush(&cmps, (Component){
        .id = 1,
        .name = copyString("foo"),
        .json = copyString("{\"prop\":2.5}"),
        .componentTypeId = 0,
        .dataBatchConfigId = dbc1->id
    });
    componentArrayPush(&cmps, (Component){
        .id = 2,
        .name = copyString("bar"),
        .json = copyString("{\"fus\":4.5}"),
        .componentTypeId = 0,
        .dataBatchConfigId = dbc2->id
    });
    // 2. Call
    char *layoutTmpl = "function (vTree, pageData, var1, var2) {"
                           "vTree.createElement('fos', null, "
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
    componentArrayPush(&cmps, (Component){
        .id = 1,
        .name = copyString("foo"),
        .json = copyString("{\"prop\":5.5}"),
        .componentTypeId = 0,
        .dataBatchConfigId = dbc1->id
    });
    componentArrayPush(&cmps, (Component){
        .id = 2,
        .name = copyString("bar"),
        .json = copyString("{\"prop\":6.6}"),
        .componentTypeId = 0,
        .dataBatchConfigId = dbc1->id
    });
    componentArrayPush(&cmps, (Component){
        .id = 3,
        .name = copyString("baz"),
        .json = copyString("{\"fus\":7.7}"),
        .componentTypeId = 0,
        .dataBatchConfigId = dbc2->id
    });
    componentArrayPush(&cmps, (Component){
        .id = 4,
        .name = copyString("naz"),
        .json = copyString("{\"fus\":8.8}"),
        .componentTypeId = 0,
        .dataBatchConfigId = dbc2->id
    });
    // 2. Call
    char *layoutTmpl = "function (vTree, pageData, foos, bars) {"
                           "vTree.createElement('fos', null, "
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
    testVTreeRegisterElementFlattensNestedArrays();
    testVTreeRegisterElementAttributes();
    testVTreeRegisterElementToleratesNonStringAttributes();
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

#undef beforeEach
