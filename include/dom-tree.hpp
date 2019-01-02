#pragma once

#include <cassert>
#include <cstring>
#include <vector>
#include <string>

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

enum NodeType {
    NODE_TYPE_ELEM,
    NODE_TYPE_TEXT,
};

class DomTree {
public:
    std::vector<ElemNode> elemNodes;
    std::vector<TextNode> textNodes;
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
     * Renders the tree to html, and returns a pointer to it.
     */
    std::string*
    render(std::string &err);
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
private:
    std::string renderedHtml;
    unsigned renderLen;
    void
    doRender(const ElemNode *node);
};
