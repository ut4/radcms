#include "testlib.hpp"
#include "../include/dom-tree.hpp"

static void
testDomTreeRenderRendersNodesWithNoChildren() {
    //
    DomTree domTree;
    domTree.createElemNode("article", nullptr, nullptr);
    domTree.rootElemIndex = 0;
    //
    std::string err;
    std::string *out = domTree.render(err);
    if (!out) { std::cerr << "Failed to render: " << err << std::endl; return; }
    //
    assertStrEquals(out->c_str(), "<article></article>");
}

static void
testDomTreeRenderRendersNodes() {
    //
    DomTree domTree;
    std::vector<unsigned> h2Content = {domTree.createTextNode("Hello")};
    std::vector<unsigned> pContent = {domTree.createTextNode("Some text")};
    std::vector<unsigned> articleChildren = {
        domTree.createElemNode("h2", nullptr, &h2Content),
        domTree.createTextNode("mixed"),
        domTree.createElemNode("p", NULL, &pContent)
    };
    domTree.createElemNode("article", NULL, &articleChildren);
    domTree.rootElemIndex = domTree.elemNodes.size() - 1;
    //
    std::string err;
    std::string *out = domTree.render(err);
    if (!out) { std::cerr << "Failed to render: " << err << std::endl; return; }
    //
    assertStrEquals(out->c_str(),
                    "<article><h2>Hello</h2>mixed<p>Some text</p></article>");
}

static void
testDomTreeRenderRendersSingleAttribute() {
    //
    DomTree domTree;
    std::vector<ElemProp> properties = {{"id", "foo"}};
    domTree.createElemNode("article", &properties, nullptr);
    domTree.rootElemIndex = 0;
    //
    std::string err;
    std::string *out = domTree.render(err);
    if (!out) { std::cerr << "Failed to render: " << err << std::endl; return; }
    //
    assertStrEquals(out->c_str(), "<article id=\"foo\"></article>");
}

static void
testDomTreeRenderRendersMultipleAttributes() {
    //
    DomTree domTree;
    std::vector<ElemProp> properties = {{"id", "foo"}, {"data-foo", "bar"}};
    domTree.createElemNode("article", &properties, nullptr);
    domTree.rootElemIndex = 0;
    //
    std::string err;
    std::string *out = domTree.render(err);
    if (!out) { std::cerr << "Failed to render: " << err << std::endl; return; }
    //
    assertStrEquals(out->c_str(), "<article id=\"foo\" data-foo=\"bar\"></article>");
}

void
domTreeTestsRun() {
    testDomTreeRenderRendersNodesWithNoChildren();
    testDomTreeRenderRendersNodes();
    testDomTreeRenderRendersSingleAttribute();
    testDomTreeRenderRendersMultipleAttributes();
}
