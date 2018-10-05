#include "../include/vTree.h"
#include <assert.h>
#include <stdio.h>

// == VTree ====
// =============================================================================
VTree *vTreeCreate() {
    VTree *out = ALLOCATE(VTree, 1);
    out->idCounter = 1;
    vNodeArrayInit(&out->nodes);
    out->render = NULL;
    out->approxMinRenderLength = 0;
    return out;
}
void vTreeDestruct(VTree *this) {
    vNodeArrayDestruct(&this->nodes);
    FREE(this->render);
    FREE(this);
}
VNode *vTreeRegisterNode(
    VTree *this,
    char *tag,
    Props *props,
    NodeContent *content
) {
    VNode newNode;
    vNodeInit(&newNode, (char*)tag, props, content, this->idCounter);
    vNodeArrayPush(&this->nodes, newNode);
    //
    this->approxMinRenderLength += strlen(tag)*2 + strlen("<>") + strlen("</>");
    if (content->type == NODE_CONTENT_STRING) {
        this->approxMinRenderLength += strlen(content->v.str);
    }
    //
    this->idCounter++;
    return &this->nodes.values[this->nodes.length - 1];
}
void vTreeGetChildTrees(VTree *this) {

}
void vTreeGetNodeByTagName(VTree *this, const char *tagname) {

}
static void vTreeWriteNode(VNode *node, VNodeArray *tree, int level, char *out) {
    strcat(out, "<");
    strcat(out, node->tagName);
    strcat(out, ">");
    switch (node->content->type) {
        case NODE_CONTENT_STRING:
            strcat(out, node->content->v.str);
            break;
        case NODE_CONTENT_NODE_REF_ARR: {
            VNodeRefArray *refs = node->content->v.nodeRefArr;
            for (int i = 0; i < refs->length; ++i) {
                vTreeWriteNode(&tree->values[refs->values[i] - 1], tree, level + 1, out);
            }
            break;
        } case NODE_CONTENT_NODE_REF:
            vTreeWriteNode(&tree->values[node->content->v.nodeRef - 1], tree, level + 1, out);
            break;
        case NODE_CONTENT_DATA_BATCH_CONFIG:
        case NODE_CONTENT_DATA_BATCH_CONFIG_ARR:
            // todo
            break;
    }
    strcat(out, "</");
    strcat(out, node->tagName);
    strcat(out, ">");
}
char *vTreeToHtml(VTree *this, int rootNodeIndex) {
    if (this->nodes.length == 0 || this->approxMinRenderLength == 0) {
        return NULL;
    }
    this->render = ALLOCATE(char, this->approxMinRenderLength);
    this->render[0] = '\0';
    VNode *rootNode = &this->nodes.values[rootNodeIndex];
    vTreeWriteNode(rootNode, &this->nodes, 0, this->render);
    return this->render;
}

// == VNode ====
// =============================================================================
void vNodeInit(
    VNode *this,
    char *tagName,
    Props *props,
    NodeContent *content,
    int id
) {
    this->tagName = tagName;
    this->props = props;
    this->content = content;
    this->id = id;
}
void vNodeDestruct(VNode *this) {
    FREE(this->tagName);
    FREE(this->props);
    nodeContentDestruct(this->content);
}

// == VNodeArray ====
// =============================================================================
void vNodeArrayInit(VNodeArray *this) {
    this->values = NULL;
    this->capacity = 0;
    this->length = 0;
}
void vNodeArrayPush(VNodeArray *this, VNode value) {
    if (this->capacity < this->length + 1) {
        int oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, VNode,
                                   oldCapacity, this->capacity);
    }
    this->values[this->length] = value;
    this->length++;
}
void vNodeArrayDestruct(VNodeArray *this) {
    for (int i = 0; i < this->length; ++i) vNodeDestruct(&this->values[i]);
    ARRAY_FREE(VNode, this->values, this->capacity);
    this->values = NULL;
    this->capacity = 0;
    this->length = 0;
}

// == VNodeRefArray ====
// =============================================================================
void vNodeRefArrayInit(VNodeRefArray *this) {
    this->capacity = 1;
    this->values = NULL;
    this->values = ARRAY_GROW(this->values, int, 0, this->capacity);
    this->length = 0;
}
void vNodeRefArrayPush(VNodeRefArray *this, int value) {
    if (this->capacity < this->length + 1) {
        int oldCapacity = this->capacity;
        this->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        this->values = ARRAY_GROW(this->values, int,
                                   oldCapacity, this->capacity);
    }
    this->values[this->length] = value;
    this->length++;
}
void vNodeRefArrayDestruct(VNodeRefArray *this) {
    ARRAY_FREE(int, this->values, this->capacity);
    this->values = NULL;
    this->capacity = 0;
    this->length = 0;
}

// == NodeContent ====
// =============================================================================
void nodeContentInitWithNodeRef(NodeContent *this, int nodeRef) {
    this->type = NODE_CONTENT_NODE_REF;
    this->v.nodeRef = nodeRef;
}
void nodeContentInitWithNodeRefArr(NodeContent *this, VNodeRefArray *nra) {
    this->type = NODE_CONTENT_NODE_REF_ARR;
    this->v.nodeRefArr = nra;
}
void nodeContentInitWithStr(NodeContent *this, char *str) {
    this->type = NODE_CONTENT_STRING;
    this->v.str = str;
}
void nodeContentInitWithDbc(NodeContent *this, DataBatchConfig *dbc) {
    this->type = NODE_CONTENT_DATA_BATCH_CONFIG;
    this->v.dbc = dbc;
}
void nodeContentInitWithDbcArr(NodeContent *this, DataBatchConfigRefListNode *rootNode) {
    this->type = NODE_CONTENT_DATA_BATCH_CONFIG_ARR;
    this->v.dbcRef = rootNode;
}
void nodeContentDestruct(NodeContent *this) {
    if (this->type == NODE_CONTENT_NODE_REF_ARR) {
        vNodeRefArrayDestruct(this->v.nodeRefArr);
    } else if (this->type == NODE_CONTENT_STRING) {
        FREE(this->v.str);
    } else if (this->type == NODE_CONTENT_DATA_BATCH_CONFIG) {
        dataBatchConfigDestruct(this->v.dbc);
    } else if (this->type == NODE_CONTENT_DATA_BATCH_CONFIG_ARR) {
        FREE(this->v.dbcRef);
    }
    FREE(this);
}