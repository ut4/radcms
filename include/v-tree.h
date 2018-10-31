#ifndef insn_vTree_h
#define insn_vTree_h

#include "memory.h"

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

typedef struct {
    unsigned capacity;
    unsigned length;
    unsigned *values;
} NodeRefArray;

typedef struct {
    unsigned id;
    char *tagName;
    NodeRefArray children;
} ElemNode;
void elemNodeFreeProps(ElemNode *this);

typedef struct {
    unsigned capacity;
    unsigned length;
    ElemNode *values;
} ElemNodeArray;

typedef struct {
    unsigned id;
    char *chars;
} TextNode;
void textNodeFreeProps(TextNode *this);

typedef struct  {
    unsigned capacity;
    unsigned length;
    TextNode *values;
} TextNodeArray;

typedef enum {
    TYPE_ELEM,
    TYPE_TEXT
} NodeType;

typedef struct {
    ElemNodeArray elemNodes;
    unsigned elemNodeCounter;
    TextNodeArray textNodes;
    unsigned textNodeCounter;
    unsigned calculatedRenderCharCount;
    int rootElemIndex;
} VTree;

void
vTreeInit(VTree *this);

void
vTreeFreeProps(VTree *this);

/**
 * Appends a new ElemNode to $this->elemNodes, and returns a reference to it.
 *
 * unsigned ref = vTreeCreateElemNode(&t, "h2", NULL);
 * unsigned type = GET_NODETYPE(ref); // NodeType.TYPE_ELEM
 * unsigned id = GET_NODEID(ref); // 1+
 * ElemNode *o = &t.elemNodes.values[id - 1];
 *   or
 * ElemNode *o = vTreeFindElemNode(ref);
 */
unsigned
vTreeCreateElemNode(VTree *this, const char *tagName, NodeRefArray *children);

/**
 * Appends a new TextNode to $this->textNodes, and returns a reference to it.
 *
 * unsigned ref = vTreeCreateTextNode(&t, "Some text");
 * unsigned type = GET_NODETYPE(ref); // NodeType.TYPE_TEXT
 * unsigned id = GET_NODEID(ref); // 1+
 * TextNode *o = &t.textNodes.values[id - 1];
 *   or
 * TextNode *o = vTreeFindTextNode(ref);
 */
unsigned
vTreeCreateTextNode(VTree *this, const char *text);

/**
 * Renders $vTree. The caller is responsible of freeing the return value.
 */
char*
vTreeToHtml(VTree *this, char *err);

/**
 * Returns ElemNode* or NULL.
 */
ElemNode*
vTreeFindElemNode(VTree *this, unsigned ref);
ElemNode*
vTreeFindElemNodeByTagName(VTree *this, const char *tagName);

/**
 * Returns TextNode* or NULL.
 */
TextNode*
vTreeFindTextNode(VTree *this, unsigned ref);

bool
vTreeReplaceRef(VTree *this, NodeType nodeType, unsigned nodeId, unsigned with);

unsigned
vTreeUtilsMakeNodeRef(NodeType type, unsigned id);

void nodeRefArrayInit(NodeRefArray *this);
void nodeRefArrayReset(NodeRefArray *this);
void nodeRefArrayPush(NodeRefArray *this, unsigned value);
void nodeRefArrayFreeProps(NodeRefArray *this);
void elemNodeArrayInit(ElemNodeArray *this);
void elemNodeArrayPush(ElemNodeArray *this, ElemNode *value);
void elemNodeArrayFreeProps(ElemNodeArray *this);
void textNodeArrayInit(TextNodeArray *this);
void textNodeArrayPush(TextNodeArray *this, TextNode *value);
void textNodeArrayFreeProps(TextNodeArray *this);

#endif