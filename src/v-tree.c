#include "../include/v-tree.h"

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

void
vTreeInit(VTree *this) {
    elemNodeArrayInit(&this->elemNodes);
    this->elemNodeCounter = 1;
    textNodeArrayInit(&this->textNodes);
    this->textNodeCounter = 1;
    this->calculatedRenderCharCount = 0;
}

void
vTreeDestruct(VTree *this) {
    elemNodeArrayDestruct(&this->elemNodes);
    this->elemNodeCounter = 1;
    textNodeArrayDestruct(&this->textNodes);
    this->textNodeCounter = 1;
    this->calculatedRenderCharCount = 0;
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
    unsigned out = 0;
    SET_NODETYPE(out, TYPE_ELEM);
    SET_NODEID(out, newId);
    return out;
}

unsigned
vTreeCreateTextNode(VTree *this, const char *text) {
    TextNode newStr = {.id=this->textNodeCounter, .chars=copyString(text)};
    this->textNodeCounter++;
    textNodeArrayPush(&this->textNodes, &newStr);
    this->calculatedRenderCharCount += strlen(text);
    unsigned out = 0;
    SET_NODETYPE(out, TYPE_TEXT);
    SET_NODEID(out, newStr.id);
    return out;
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
    ElemNode *root = &this->elemNodes.values[this->elemNodes.length - 1];
    doRender(this, root, out);
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

void elemNodeDestruct(ElemNode *this) {
    if (this->children.length) nodeRefArrayDestruct(&this->children);
    FREE_STR(this->tagName);
}

void textNodeDestruct(TextNode *this) {
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
void elemNodeArrayDestruct(ElemNodeArray *this) {
    for (unsigned i = 0; i < this->length; ++i) {
        elemNodeDestruct(&this->values[i]);
    }
    if (this->values) FREE_ARR(ElemNode, this->values, this->capacity);
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
void textNodeArrayDestruct(TextNodeArray *this) {
    for (unsigned i = 0; i < this->length; ++i) textNodeDestruct(&this->values[i]);
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
void nodeRefArrayDestruct(NodeRefArray *this) {
    FREE_ARR(unsigned, this->values, this->capacity);
    nodeRefArrayReset(this);
}
