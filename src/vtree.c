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
void vTreeDestruct(VTree *vTree) {
    vNodeArrayDestruct(&vTree->nodes);
    FREE(vTree->render);
    FREE(vTree);
}
VNode *vTreeRegisterNode(
    VTree *vTree,
    char *tag,
    Props *props,
    NodeContent *content
) {
    VNode newNode;
    vNodeInit(&newNode, (char*)tag, props, content, vTree->idCounter);
    vNodeArrayPush(&vTree->nodes, newNode);
    //
    vTree->approxMinRenderLength += strlen(tag)*2 + strlen("<>") + strlen("</>");
    if (content->type == NODE_CONTENT_STRING) {
        vTree->approxMinRenderLength += strlen(content->v.str);
    }
    //
    vTree->idCounter++;
    return &vTree->nodes.values[vTree->nodes.length - 1];
}
void vTreeGetChildTrees(VTree *vTree) {

}
void vTreeGetNodeByTagName(VTree *vTree, const char *tagname) {

}
static void writeNode(VNode *node, VNodeArray *tree, int level, char *out) {
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
                writeNode(&tree->values[refs->values[i] - 1], tree, level + 1, out);
            }
            break;
        } case NODE_CONTENT_NODE_REF:
            writeNode(&tree->values[node->content->v.nodeRef - 1], tree, level + 1, out);
            break;
        case NODE_CONTENT_DATA_BATCH_CONFIG:
            // pass
            break;
    }
    strcat(out, "</");
    strcat(out, node->tagName);
    strcat(out, ">");
}
char *vTreeToHtml(VTree *vTree) {
    if (vTree->nodes.length == 0 || vTree->approxMinRenderLength == 0) {
        return NULL;
    }
    vTree->render = ALLOCATE(char, vTree->approxMinRenderLength);
    vTree->render[0] = '\0';
    VNode *rootNode = &vTree->nodes.values[vTree->nodes.length - 1];
    writeNode(rootNode, &vTree->nodes, 0, vTree->render);
    return vTree->render;
}

// == VNode ====
// =============================================================================
void vNodeInit(
    VNode *vNode,
    char *tagName,
    Props *props,
    NodeContent *content,
    int id
) {
    vNode->tagName = tagName;
    vNode->props = props;
    vNode->content = content;
    vNode->id = id;
}
void vNodeDestruct(VNode *vNode) {
    FREE(vNode->tagName);
    FREE(vNode->props);
    nodeContentDestruct(vNode->content);
}

// == VNodeArray ====
// =============================================================================
void vNodeArrayInit(VNodeArray *array) {
    array->values = NULL;
    array->capacity = 0;
    array->length = 0;
}
void vNodeArrayPush(VNodeArray *array, VNode value) {
    if (array->capacity < array->length + 1) {
        int oldCapacity = array->capacity;
        array->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        array->values = ARRAY_GROW(array->values, VNode,
                                   oldCapacity, array->capacity);
    }
    array->values[array->length] = value;
    array->length++;
}
void vNodeArrayDestruct(VNodeArray *array) {
    for (int i = 0; i < array->length; ++i) vNodeDestruct(&array->values[i]);
    ARRAY_FREE(VNode, array->values, array->capacity);
    array->values = NULL;
    array->capacity = 0;
    array->length = 0;
}

// == VNodeRefArray ====
// =============================================================================
void vNodeRefArrayInit(VNodeRefArray *array) {
    array->capacity = 1;
    array->values = NULL;
    array->values = ARRAY_GROW(array->values, int, 0, array->capacity);
    array->length = 0;
}
void vNodeRefArrayPush(VNodeRefArray *array, int value) {
    if (array->capacity < array->length + 1) {
        int oldCapacity = array->capacity;
        array->capacity = ARRAY_INCREASE_CAPACITY(oldCapacity);
        array->values = ARRAY_GROW(array->values, int,
                                   oldCapacity, array->capacity);
    }
    array->values[array->length] = value;
    array->length++;
}
void vNodeRefArrayDestruct(VNodeRefArray *array) {
    ARRAY_FREE(int, array->values, array->capacity);
    array->values = NULL;
    array->capacity = 0;
    array->length = 0;
}

// == NodeContent ====
// =============================================================================
void nodeContentInit(
    NodeContent *content,
    NodeContentType type,
    void *val
) {
    content->type = type;
    switch (type) {
        case NODE_CONTENT_NODE_REF_ARR:
            content->v.nodeRefArr = (VNodeRefArray*)val;
            break;
        case NODE_CONTENT_NODE_REF:
            content->v.nodeRef = (int)val;
            break;
        case NODE_CONTENT_DATA_BATCH_CONFIG:
            content->v.dbc = (DataBatchConfig*)val;
            break;
        case NODE_CONTENT_STRING:
            content->v.str = (char*)val;
            break;
    }
}
void nodeContentDestruct(NodeContent *content) {
    switch (content->type) {
        case NODE_CONTENT_NODE_REF_ARR:
            vNodeRefArrayDestruct(content->v.nodeRefArr);
            break;
        case NODE_CONTENT_NODE_REF:
            // pass
            break;
        case NODE_CONTENT_DATA_BATCH_CONFIG:
            dataBatchConfigDestruct(content->v.dbc);
            break;
        case NODE_CONTENT_STRING:
            FREE(content->v.str);
            break;
    }
    FREE(content);
}