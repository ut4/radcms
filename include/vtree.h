#ifndef rad3_vTree_h
#define rad3_vTree_h

#include "data-access.h"
#include "memory.h"

typedef struct {
    int todo;
} Props;

typedef enum {
    NODE_CONTENT_STRING,
    NODE_CONTENT_NODE_REF,
    NODE_CONTENT_NODE_REF_ARR,
    NODE_CONTENT_DATA_BATCH_CONFIG
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
    } v;
} NodeContent;
void nodeContentInit(
    NodeContent *content,
    NodeContentType type,
    void *val
);
void nodeContentDestruct(NodeContent *content);

typedef struct {
    char *tagName;
    Props *props;
    NodeContent *content;
    int id;
} VNode;
void vNodeInit(
    VNode *vNode,
    char *tagName,
    Props *props,
    NodeContent *content,
    int id
);
void vNodeDestruct(VNode *vNode);

typedef struct {
    int capacity;
    int length;
    VNode* values;
} VNodeArray;
void vNodeArrayInit(VNodeArray *array);
void vNodeArrayPush(VNodeArray *array, VNode value);
void vNodeArrayDestruct(VNodeArray *array);

struct VNodeRefArray {
    int capacity;
    int length;
    int* values;
};
void vNodeRefArrayInit(VNodeRefArray *array);
void vNodeRefArrayPush(VNodeRefArray *array, int value);
void vNodeRefArrayDestruct(VNodeRefArray *array);

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
void vTreeDestruct(VTree *vTree);
/*
 */
VNode *vTreeRegisterNode(
    VTree *vTree,
    char *tagName,
    Props *props,
    NodeContent *content
);
/*
 */
void vTreeGetChildTrees(VTree *vTree);
/*
 */
void vTreeGetVNodeByTagName(VTree *vTree, const char *tagname);
/*
 */
char *vTreeToHtml(VTree *vTree);

#endif