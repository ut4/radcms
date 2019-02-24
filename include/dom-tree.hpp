#pragma once

#include <cassert>
#include <cstring>
#include <vector>
#include <string>
#include "../c-libs/jsx/include/jsx-transpiler.hpp"

typedef std::pair<std::string, std::string> ElemProp;

struct ElemNode {
    unsigned id;
    std::string tagName;
    std::vector<ElemProp> properties;
    std::vector<unsigned> children;
};

struct TextNode {
    unsigned id;
    std::string chars;
};

struct FuncNode;
typedef unsigned (*fnComponentFn)(FuncNode *me, std::string &err);

struct FuncNode {
    unsigned id;
    unsigned rootElemNodeRef;
    fnComponentFn fn;
    void *myPtr;
    std::vector<ElemProp> properties;
};

enum NodeType {
    NODE_TYPE_ELEM,
    NODE_TYPE_TEXT,
    NODE_TYPE_FUNC,
};

class DomTree;
/** If return value == false -> break else -> continue */
typedef bool (*domTreeTraverseFn)(DomTree *self, NodeType nodeType,
                                  unsigned nodeId, void *myPtr);

class DomTree {
public:
    std::vector<ElemNode> elemNodes;
    std::vector<TextNode> textNodes;
    std::vector<FuncNode> funcNodes;
    int rootElemIndex = -1;
    /**
     * Appends a new ElemNode to $this->elemNodes, and returns a reference to it.
     *
     * unsigned ref = domTree.createElemNode("h2", nullptr);
     * unsigned type = GET_NODETYPE(ref); // NODE_TYPE_ELEM
     * unsigned id = GET_NODEID(ref); // 1+
     * ElemNode *n = domTree.getElemNode(ref);
     */
    unsigned
    createElemNode(const char *tagName, std::vector<ElemProp> *props,
                   std::vector<unsigned> *children);
    /**
     * Appends a new TextNode to $this->textNodes, and returns a reference to it.
     *
     * unsigned ref = domTree.createTextNode("Some text");
     * unsigned type = GET_NODETYPE(ref); // NODE_TYPE_TEXT
     * unsigned id = GET_NODEID(ref); // 1+
     * TextNode *n = domTree.getTextNode(ref);
     */
    unsigned
    createTextNode(const char *text);
    /**
     * Appends a new FuncNode to $this->funcNodes, and returns a reference to it.
     *
     * unsigned myFnComponent(FuncNode *me, std::string &err) {
     *     auto *domTree = static_cast<DomTree*>(me->myPtr);
     *     std::vector<unsigned> textContent = {domTree->createTextNode("Hello")};
     *     return domTree->createElemNode("div", nullptr, &textContent),
     * }
     * unsigned ref = domTree.createFuncNode(myFnComponent, &domTree);
     * unsigned type = GET_NODETYPE(ref); // NODE_TYPE_FUNC
     * unsigned id = GET_NODEID(ref); // 1+
     * FuncNode *n = domTree.getFuncNode(ref);
     */
    unsigned
    createFuncNode(fnComponentFn fn, void *fnMyPtr);
    /**
     * Renders the tree to html, and returns a pointer to it.
     */
    std::string*
    render(std::string &err);
    /**
     * Does something like: for (auto node: this->tree) {
     *     if (fn(node.type...)) continue;
     *     else break;
     * }
     */
    bool
    traverse(domTreeTraverseFn fn, void *myPtr, std::string &err);
    /**
     * Returns ElemNode or nullptr. see createElemNode().
     */
    ElemNode*
    getElemNode(unsigned ref);
    /**
     * Returns TextNode or nullptr. see createTextNode().
     */
    TextNode*
    getTextNode(unsigned ref);
    /**
     * Returns FuncNode or nullptr. see createFuncNode().
     */
    FuncNode*
    getFuncNode(unsigned ref);
    /***/
    static NodeType getNodeType(unsigned ref);
private:
    std::string renderedHtml;
    unsigned renderLenHint;
    bool
    doRender(const ElemNode *node, std::string &err);
    bool
    doTraverse(domTreeTraverseFn fn, void *myPtr, ElemNode &e, std::string &err);
    ElemNode*
    lazilyExecFnCmpFn(unsigned ref, std::string &err);
};
