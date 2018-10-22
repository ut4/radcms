#include "../include/v-tree.h"

void
vTreeInit(VTree *this) {
    elemNodeArrayInit(&this->elemNodes);
    this->elemNodeCounter = 1;
    textNodeArrayInit(&this->textNodes);
    this->textNodeCounter = 1;
    this->calculatedRenderCharCount = 0;
    this->rootElemIndex = 0;
}

void
vTreeFreeProps(VTree *this) {
    elemNodeArrayFreeProps(&this->elemNodes);
    this->elemNodeCounter = 1;
    textNodeArrayFreeProps(&this->textNodes);
    this->textNodeCounter = 1;
    this->calculatedRenderCharCount = 0;
    this->rootElemIndex = 0;
}

unsigned
vTreeCreateElemNode(VTree *this, const char *tagName, NodeRefArray *children) {
    unsigned newId;
    if (children) {
        ElemNode newNode = {.id = this->elemNodeCounter, .tagName=copyString(tagName),
                            .children = *children};
        elemNodeArrayPush(&this->elemNodes, &newNode);
        newId = newNode.id;
    } else {
        ElemNode newNode = {.id = this->elemNodeCounter, .tagName=copyString(tagName)};
        nodeRefArrayReset(&newNode.children);
        elemNodeArrayPush(&this->elemNodes, &newNode);
        newId = newNode.id;
    }
    this->elemNodeCounter++;
    this->calculatedRenderCharCount += strlen(tagName)*2 + strlen("<></>");
    return vTreeUtilsMakeNodeRef(TYPE_ELEM, newId);
}

unsigned
vTreeCreateTextNode(VTree *this, const char *text) {
    TextNode newStr = {.id=this->textNodeCounter, .chars=copyString(text)};
    this->textNodeCounter++;
    textNodeArrayPush(&this->textNodes, &newStr);
    this->calculatedRenderCharCount += strlen(text);
    return vTreeUtilsMakeNodeRef(TYPE_TEXT, newStr.id);
}

static void
doRender(VTree *this, ElemNode *node, char *out) {
    strcat(out, "<");
    strcat(out, node->tagName);
    strcat(out, ">");
    if (node->children.length) {
        for (unsigned i = 0; i < node->children.length; ++i) {
            unsigned ref = node->children.values[i];
            if (GET_NODETYPE(ref) == TYPE_ELEM) {
                doRender(this, vTreeFindElemNode(this, ref), out);
            } else {
                strcat(out, vTreeFindTextNode(this, ref)->chars);
            }
        }
    }
    strcat(out, "</");
    strcat(out, node->tagName);
    strcat(out, ">");
}

char*
vTreeToHtml(VTree *this, char *err) {
    if (this->elemNodes.length == 0) {
        putError("Cannot render an empty vTree.\n");
        return NULL;
    }
    char *out = ALLOCATE_ARR(char, this->calculatedRenderCharCount + 1);
    out[0] = '\0';
    doRender(this, &this->elemNodes.values[this->rootElemIndex], out);
    if (strlen(out) > this->calculatedRenderCharCount) {
        printToStdErr("calculatedRenderCharCount was %d, but actually wrote "
                      "%d chars! Exiting.\n", this->calculatedRenderCharCount,
                      strlen(out));
        exit(EXIT_FAILURE);
    }
    return out;
}

ElemNode*
vTreeFindElemNode(VTree *this, unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->elemNodes.length ? &this->elemNodes.values[idx] : NULL;
}

ElemNode*
vTreeFindElemNodeByTagName(VTree *this, const char *tagName) {
    if (this->elemNodes.length == 0) return NULL;
    for (unsigned i = 0; i < this->elemNodes.length; ++i) {
        if (strcmp(this->elemNodes.values[i].tagName, tagName) == 0)
            return &this->elemNodes.values[i];
    }
    return NULL;
}

TextNode*
vTreeFindTextNode(VTree *this, unsigned ref) {
    unsigned idx = GET_NODEID(ref) - 1;
    return idx < this->textNodes.length ? &this->textNodes.values[idx] : NULL;
}

static bool
doReplaceRef(VTree *this, ElemNode *elem, NodeType nodeType, unsigned nodeId,
             unsigned with) {
    for (unsigned i = 0; i < elem->children.length; ++i) {
        unsigned ref = elem->children.values[i];
        NodeType t = GET_NODETYPE(ref);
        if (t == nodeType && GET_NODEID(ref) == nodeId) {
            elem->children.values[i] = with;
            return true;
        }
        if (t == TYPE_ELEM && doReplaceRef(this, vTreeFindElemNode(this, ref),
                                           nodeType, nodeId, with)) {
            return true;
        }
    }
    return false;
}

bool
vTreeReplaceRef(VTree *this, NodeType nodeType, unsigned nodeId, unsigned with) {
    return doReplaceRef(this, &this->elemNodes.values[this->rootElemIndex],
                        nodeType, nodeId, with);
}

unsigned
vTreeUtilsMakeNodeRef(NodeType type, unsigned id) {
    unsigned out = 0;
    SET_NODETYPE(out, type);
    SET_NODEID(out, id);
    return out;
}

void elemNodeFreeProps(ElemNode *this) {
    if (this->children.length) nodeRefArrayFreeProps(&this->children);
    FREE_STR(this->tagName);
}

void textNodeFreeProps(TextNode *this) {
    FREE_STR(this->chars);
}

void elemNodeArrayInit(ElemNodeArray *this) {
    this->length = 0;
    this->capacity = 0;
    this->values = NULL;
}
void elemNodeArrayPush(ElemNodeArray *this, ElemNode *value) {
    if (this->capacity < this->length + 1) {
        unsigned oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, ElemNode,
                                  oldCapacity, this->capacity);
    }
    this->values[this->length] = *value;
    this->length++;
}
void elemNodeArrayFreeProps(ElemNodeArray *this) {
    if (this->length) {
        for (unsigned i = 0; i < this->length; ++i) {
            elemNodeFreeProps(&this->values[i]);
        }
        FREE_ARR(ElemNode, this->values, this->capacity);
    }
    elemNodeArrayInit(this);
}

void textNodeArrayInit(TextNodeArray *this) {
    this->length = 0;
    this->capacity = 1;
    this->values = NULL;
    this->values = ARRAY_GROW(this->values, TextNode, 0, this->capacity);
}
void textNodeArrayPush(TextNodeArray *this, TextNode *value) {
    if (this->capacity < this->length + 1) {
        unsigned oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, TextNode,
                                  oldCapacity, this->capacity);
    }
    this->values[this->length] = *value;
    this->length++;
}
void textNodeArrayFreeProps(TextNodeArray *this) {
    for (unsigned i = 0; i < this->length; ++i) textNodeFreeProps(&this->values[i]);
    FREE_ARR(TextNode, this->values, this->capacity);
    this->length = 0;
    this->capacity = 0;
    this->values = NULL;
}

void nodeRefArrayInit(NodeRefArray *this) {
    this->length = 0;
    this->capacity = 1;
    this->values = NULL;
    this->values = ARRAY_GROW(this->values, unsigned, 0, this->capacity);
}
void nodeRefArrayPush(NodeRefArray *this, unsigned value) {
    if (this->capacity < this->length + 1) {
        unsigned oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, unsigned, oldCapacity,
                                  this->capacity);
    }
    this->values[this->length] = value;
    this->length++;
}
void nodeRefArrayReset(NodeRefArray *this) {
    this->length = 0;
    this->capacity = 0;
    this->values = NULL;
}
void nodeRefArrayFreeProps(NodeRefArray *this) {
    FREE_ARR(unsigned, this->values, this->capacity);
    nodeRefArrayReset(this);
}
