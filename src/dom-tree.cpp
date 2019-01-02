#include "../include/dom-tree.hpp"

/*
 * https://www.lua.org/source/5.3/lopcodes.h.html#MASK_WITH_1
 *
 * creates a mask with $howMany 1 bits at position $startingAt
 */
#define MASK_WITH_1(howMany, startingAt) ((~((~0)<<howMany))<<startingAt)
/*
 * creates a mask with $howMany 0 bits at position $startingAt
 */
#define MASK_WITH_0(howMany, startingAt) (~MASK_WITH_1(howMany, startingAt))
/*
 * Stores $nodeType (>=0 and <= 15) to 0000000000000000000000000000xxxx bits of
 * an unsigned int $to.
 */
#define SET_NODETYPE(to, nodeType) to = (to & MASK_WITH_0(4, 0)) | \
                                        (nodeType & MASK_WITH_1(4, 0))
/*
 * Extracts 0000000000000000000000000000xxxx bits from $from as an integer.
 */
#define GET_NODETYPE(from) (from & MASK_WITH_1(4, 0))
/*
 * Stores $nodeVal (>= 0 and <= 268435455) to xxxxxxxxxxxxxxxxxxxxxxxxxxxx0000
 * bits of an unsigned int $to.
 */
#define SET_NODEID(to, nodeVal) to = (to & MASK_WITH_0(28, 4)) | \
                                ((nodeVal << 4) & MASK_WITH_1(28, 4))
/*
 * Extracts xxxxxxxxxxxxxxxxxxxxxxxxxxxx0000 bits from $from as an integer.
 */
#define GET_NODEID(from) ((from >> 4) & MASK_WITH_1(28, 0))

unsigned
DomTree::createElemNode(const char *tagName, std::vector<ElemProp> *props,
                        std::vector<unsigned> *children) {
    ElemNode &newElem = this->elemNodes.emplace_back();
    newElem.id = this->elemNodes.size();
    newElem.tagName = tagName;
    this->renderLen += strlen(tagName) * 2 + strlen("<></>");
    if (props) {
        newElem.properties.insert(newElem.properties.begin(),
                                  std::make_move_iterator(props->begin()), 
                                  std::make_move_iterator(props->end()));
        for (const ElemProp &prop: newElem.properties) {
            this->renderLen += prop.first.size() + prop.second.size() +
                               strlen(" =\"\"");
        }
    }
    if (children) {
        newElem.children.insert(newElem.children.begin(),
                                std::make_move_iterator(children->begin()), 
                                std::make_move_iterator(children->end()));
    }
    //
    unsigned out = 0;
    SET_NODETYPE(out, NODE_TYPE_ELEM);
    SET_NODEID(out, newElem.id);
    return out;
}

unsigned
DomTree::createTextNode(const char *text) {
    TextNode &newElem = this->textNodes.emplace_back();
    newElem.id = this->textNodes.size();
    newElem.chars = text;
    this->renderLen += strlen(text);
    //
    unsigned out = 0;
    SET_NODETYPE(out, NODE_TYPE_TEXT);
    SET_NODEID(out, newElem.id);
    return out;
}

std::string*
DomTree::render(std::string &err) {
    if (this->elemNodes.empty() || this->rootElemIndex < 0) {
        err.assign("Cannot render an empty domTree.\n");
        return nullptr;
    }
    this->renderedHtml.reserve(this->renderLen);
    this->doRender(&this->elemNodes[this->rootElemIndex]);
    return &this->renderedHtml;
}

ElemNode*
DomTree::getElemNode(unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->elemNodes.size() ? &this->elemNodes[idx] : NULL;
}

TextNode*
DomTree::getTextNode(unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->textNodes.size() ? &this->textNodes[idx] : NULL;
}

void
DomTree::doRender(const ElemNode *node) {
    std::string &r = this->renderedHtml;
    r += "<";
    r += node->tagName;
    for (const ElemProp &prop: node->properties) {
        r += " ";
        r += prop.first;
        r += "=\"";
        r += prop.second;
        r += "\"";
    }
    r += ">";
    for (unsigned ref: node->children) {
        if (GET_NODETYPE(ref) == NODE_TYPE_ELEM) {
            ElemNode *n = this->getElemNode(ref);
            assert(n != nullptr && "getElemNode() == nullptr");
            this->doRender(n);
        } else {
            TextNode *n = this->getTextNode(ref);
            assert(n != nullptr && "getTextNode() == nullptr");
            r += n->chars;
        }
    }
    r += "</";
    r += node->tagName;
    r += ">";
}
