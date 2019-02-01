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
    this->renderLenHint += strlen(tagName) * 2 + strlen("<></>");
    if (props) {
        newElem.properties.insert(newElem.properties.begin(),
                                  std::make_move_iterator(props->begin()), 
                                  std::make_move_iterator(props->end()));
        for (const ElemProp &prop: newElem.properties) {
            this->renderLenHint += prop.first.size() + prop.second.size() +
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
    this->renderLenHint += strlen(text);
    //
    unsigned out = 0;
    SET_NODETYPE(out, NODE_TYPE_TEXT);
    SET_NODEID(out, newElem.id);
    return out;
}

unsigned
DomTree::createFuncNode(fnComponentFn fn, void *fnMyPtr) {
    FuncNode &newElem = this->funcNodes.emplace_back();
    newElem.id = this->funcNodes.size();
    newElem.rootElemNodeRef = 0;
    newElem.fn = fn;
    newElem.myPtr = fnMyPtr;
    //
    unsigned out = 0;
    SET_NODETYPE(out, NODE_TYPE_FUNC);
    SET_NODEID(out, newElem.id);
    return out;
}

std::string*
DomTree::render(std::string &err) {
    if (this->elemNodes.empty() || this->rootElemIndex < 0) {
        err.assign("Cannot render an empty domTree.\n");
        return nullptr;
    }
    this->renderedHtml.reserve(this->renderLenHint);
    if (this->doRender(&this->elemNodes[this->rootElemIndex], err)) {
        return &this->renderedHtml;
    }
    return nullptr;
}

bool
DomTree::traverse(domTreeTraverseFn fn, void *myPtr, std::string &err) {
    if (this->elemNodes.empty() || this->rootElemIndex < 0) {
        err.assign("Cannot traverse an empty domTree.\n");
        return false;
    }
    this->doTraverse(fn, myPtr, this->elemNodes[this->rootElemIndex], err);
    return err.empty();
}

ElemNode*
DomTree::getElemNode(unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->elemNodes.size() ? &this->elemNodes[idx] : nullptr;
}

TextNode*
DomTree::getTextNode(unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->textNodes.size() ? &this->textNodes[idx] : nullptr;
}

FuncNode*
DomTree::getFuncNode(unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->funcNodes.size() ? &this->funcNodes[idx] : nullptr;
}

/*static*/ NodeType
DomTree::getNodeType(unsigned ref) {
    return static_cast<NodeType>(GET_NODETYPE(ref));
}

/*private*/ bool
DomTree::doRender(const ElemNode *node, std::string &err) {
    std::string &r = this->renderedHtml;
    unsigned nidx = node->id - 1;
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
        const unsigned type = GET_NODETYPE(ref);
        if (type == NODE_TYPE_ELEM) {
            ElemNode *n = this->getElemNode(ref);
            assert(n != nullptr && "getElemNode() == nullptr");
            if (!this->doRender(n, err)) return false;
        } else if (type == NODE_TYPE_TEXT) {
            TextNode *n = this->getTextNode(ref);
            assert(n != nullptr && "getTextNode() == nullptr");
            r += n->chars;
        } else {
            ElemNode *rootElem = this->lazilyExecFnCmpFn(ref, err);
            if ((rootElem && !this->doRender(rootElem, err)) || !rootElem) return false;
        }
    }
    r += "</";
    r += this->elemNodes[nidx].tagName;
    r += ">";
    return true;
}

/*private*/ bool
DomTree::doTraverse(domTreeTraverseFn fn, void *myPtr, ElemNode &e,
                    std::string &err) {
    if (!fn(this, NODE_TYPE_ELEM, e.id, myPtr)) return false;
    for (unsigned ref: e.children) {
        const unsigned type = GET_NODETYPE(ref);
        if (type == NODE_TYPE_ELEM) {
            ElemNode *n = this->getElemNode(ref);
            assert(n != nullptr && "getElemNode() == nullptr");
            this->doTraverse(fn, myPtr, *n, err);
        } else if (type == NODE_TYPE_FUNC) {
            if (!fn(this, NODE_TYPE_FUNC, GET_NODEID(ref), myPtr))
                return false;
            ElemNode *rootElem = this->lazilyExecFnCmpFn(ref, err);
            if ((rootElem && !this->doTraverse(fn, myPtr, *rootElem, err)) || !rootElem) return false;
        } else if (!fn(this, NODE_TYPE_TEXT, GET_NODEID(ref), myPtr)) {
            return false;
        }
    }
    return true;
}

/* private*/ ElemNode*
DomTree::lazilyExecFnCmpFn(unsigned ref, std::string &err) {
    FuncNode *n = this->getFuncNode(ref);
    assert(n != nullptr && "getFuncNode() == nullptr");
    if (n->rootElemNodeRef == 0) { // Hasn't run yet.
        unsigned r = n->fn(n, err); // Run it. Usually invalidates n.
        n = this->getFuncNode(ref);
        n->rootElemNodeRef = r;
        if (n->rootElemNodeRef > 0) {
            ElemNode *rootElem = this->getElemNode(n->rootElemNodeRef);
            assert(rootElem != nullptr && "getElemNode() == nullptr");
            return rootElem;
        }
        return nullptr;
    }
    return this->getElemNode(n->rootElemNodeRef);
}
