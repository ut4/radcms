#ifndef rad3_vtree_h
#define rad3_vtree_h

#include "data-access.h"
#include "memory.h"

typedef struct {
    int todo;
} Props;

typedef enum {
    NODE_CONTENT_STRING,
    NODE_CONTENT_NODE_REF,
    NODE_CONTENT_NODE_REF_ARR,
    NODE_CONTENT_DATA_BATCH_CONFIG,
    NODE_CONTENT_DATA_BATCH_CONFIG_ARR
} NodeContentType;

struct VNodeRefArray;
typedef struct VNodeRefArray VNodeRefArray;
typedef struct {
    NodeContentType type;
    union {
        VNodeRefArray *nodeRefArr;
        int nodeRef;
        char *str;
        DataBatchConfig *dbc;
        DataBatchConfigRefListNode *dbcRef;
    } v;
} NodeContent;
void nodeContentInitWithNodeRef(NodeContent *this, int nodeRef);
void nodeContentInitWithNodeRefArr(NodeContent *this, VNodeRefArray *nra);
void nodeContentInitWithStr(NodeContent *this, char *str);
void nodeContentInitWithDbc(NodeContent *this, DataBatchConfig *dbc);
void nodeContentInitWithDbcArr(NodeContent *this, DataBatchConfigRefListNode *rootNode);
void nodeContentDestruct(NodeContent *this);

typedef struct {
    char *tagName;
    Props *props;
    NodeContent *content; // remove *?
    int id;
} VNode;
void vNodeInit(
    VNode *this,
    char *tagName,
    Props *props,
    NodeContent *content,
    int id
);
void vNodeDestruct(VNode *this);

typedef struct {
    int capacity;
    int length;
    int maxLength;
    VNode* values;
} VNodeArray;
void vNodeArrayInit(VNodeArray *this);
void vNodeArrayPush(VNodeArray *this, VNode value);
void vNodeArrayDestruct(VNodeArray *this);

struct VNodeRefArray {
    int capacity;
    int length;
    int* values;
};
void vNodeRefArrayInit(VNodeRefArray *this);
void vNodeRefArrayPush(VNodeRefArray *this, int value);
void vNodeRefArrayDestruct(VNodeRefArray *this);

typedef struct {
    int idCounter;
    char *render;
    int approxMinRenderLength; // number of characters that can be calculated during vTreeRegisterNode|e()-calls
    VNodeArray nodes;
} VTree;

/*
 */
VTree *vTreeCreate();
/*
 */
void vTreeDestruct(VTree *this);
/*
 */
VNode *vTreeRegisterNode(
    VTree *this,
    char *tagName,
    Props *props,
    NodeContent *content
);
/*
 */
void vTreeGetChildTrees(VTree *this);
/*
 */
void vTreeGetVNodeByTagName(VTree *this, const char *tagname);
/*
 * Renders $this->nodes recursively. Caller should NOT free the return value.
 */
char *vTreeToHtml(VTree *this, int rootNodeIndex);

#endif