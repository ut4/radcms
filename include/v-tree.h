#ifndef insn_vTree_h
#define insn_vTree_h

#include "memory.h"

typedef struct {
    unsigned capacity;
    unsigned length;
    unsigned *values;
} NodeRefArray;
void nodeRefArrayInit(NodeRefArray *this);
void nodeRefArrayPush(NodeRefArray *this, unsigned value);
void nodeRefArrayDestruct(NodeRefArray *this);

typedef struct {
    unsigned id;
    char *tagName;
    NodeRefArray *children;
} ElemNode;
void elemNodeDestruct(ElemNode *this);

typedef struct {
    unsigned capacity;
    unsigned length;
    ElemNode *values;
} ElemNodeArray;
void elemNodeArrayInit(ElemNodeArray *this);
void elemNodeArrayPush(ElemNodeArray *this, ElemNode *value);
void elemNodeArrayDestruct(ElemNodeArray *this);

typedef struct {
    unsigned id;
    char *chars;
} TextNode;
void textNodeDestruct(TextNode *this);

typedef struct  {
    unsigned capacity;
    unsigned length;
    TextNode *values;
} TextNodeArray;
void textNodeArrayInit(TextNodeArray *this);
void textNodeArrayPush(TextNodeArray *this, TextNode *value);
void textNodeArrayDestruct(TextNodeArray *this);

typedef enum {
    TYPE_ELEM,
    TYPE_TEXT,
} NodeType;

typedef struct {
    ElemNodeArray elemNodes;
    unsigned elemNodeCounter;
    TextNodeArray textNodes;
    unsigned textNodeCounter;
    char *renderedHtml;
    unsigned calculatedRenderCharCount;
} VTree;

void
vTreeInit(VTree *this);

void
vTreeDestruct(VTree *this);

/**
 * Appends a new ElemNode to $this->elemNodes, and returns a reference to it.
 *
 * unsigned ref = vTreeCreateElemNode(&t, "h2", NULL);
 * unsigned type = GET_NODETYPE(ref); // NodeType.TYPE_ELEM
 * unsigned id = GET_NODEID(ref); // 1+
 * ElemNode *o = &t.elemNodes.values[id - 1];
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
 * TextNode *0 = vTreeFindTextNode(ref);
 */
unsigned
vTreeCreateTextNode(VTree *this, const char *text);

/**
 * The caller shouldn't free the return value.
 */
char*
vTreeToHtml(VTree *this, char *err);

/**
 * Returns ElemNode* or NULL.
 */
ElemNode*
vTreeFindElemNode(VTree *this, unsigned ref);

/**
 * Returns TextNode* or NULL.
 */
TextNode*
vTreeFindTextNode(VTree *this, unsigned ref);

#endif