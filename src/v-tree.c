#include "../include/v-tree.h"

void
vTreeInit(VTree *this) {
    elemNodeArrayInit(&this->elemNodes);
    this->elemNodeCounter = 1;
    textNodeArrayInit(&this->textNodes);
    this->textNodeCounter = 1;
    this->calculatedRenderCharCount = 0;
    this->rootElemIndex = -1;
}

void
vTreeFreeProps(VTree *this) {
    elemNodeArrayFreeProps(&this->elemNodes);
    this->elemNodeCounter = 1;
    textNodeArrayFreeProps(&this->textNodes);
    this->textNodeCounter = 1;
    this->calculatedRenderCharCount = 0;
    this->rootElemIndex = -1;
}

unsigned
vTreeCreateElemNode(VTree *this, const char *tagName, ElemProp *props,
                    NodeRefArray *children) {
    elemNodeArrayPush(&this->elemNodes, (ElemNode){
        .id = this->elemNodeCounter,
        .tagName = copyString(tagName),
        .props = props,
        .children = children ? *children : (NodeRefArray){0, 0, NULL}
    });
    this->elemNodeCounter += 1;
    this->calculatedRenderCharCount += strlen(tagName)*2 + strlen("<></>");
    ElemProp *cur = props;
    while (cur) {
        this->calculatedRenderCharCount += strlen(cur->key) + strlen(cur->val) + strlen(" =\"\"");
        cur = cur->next;
    }
    return vTreeUtilsMakeNodeRef(TYPE_ELEM, this->elemNodeCounter - 1);
}

unsigned
vTreeCreateTextNode(VTree *this, const char *text) {
    textNodeArrayPush(&this->textNodes, (TextNode){
        .id = this->textNodeCounter,
        .chars = copyString(text)
    });
    this->calculatedRenderCharCount += strlen(text);
    this->textNodeCounter++;
    return vTreeUtilsMakeNodeRef(TYPE_TEXT, this->textNodeCounter - 1);
}

static char*
doRender(VTree *this, ElemNode *node, char *out) {
    //
    out += sprintf(out, "<%s", node->tagName);
    //
    ElemProp *cur = node->props;
    while (cur) {
        out += sprintf(out, " %s=\"%s\"", cur->key, cur->val);
        cur = cur->next;
    }
    //
    *out = '>';
    out += 1;
    //
    if (node->children.length) {
        for (unsigned i = 0; i < node->children.length; ++i) {
            unsigned ref = node->children.values[i];
            if (GET_NODETYPE(ref) == TYPE_ELEM) {
                out = doRender(this, vTreeFindElemNode(this, ref), out);
            } else {
                out += sprintf(out, "%s", vTreeFindTextNode(this, ref)->chars);
            }
        }
    }
    //
    out += sprintf(out, "</%s>", node->tagName);
    return out;
}

char*
vTreeToHtml(VTree *this, char *err) {
    if (this->elemNodes.length == 0 || this->rootElemIndex < 0) {
        putError("Cannot render an empty vTree.\n");
        return NULL;
    }
    char *out = ALLOCATE_ARR(char, this->calculatedRenderCharCount + 1);
    out[0] = '\0';
    doRender(this, &this->elemNodes.values[this->rootElemIndex], out);
    ASSERT(strlen(out) <= this->calculatedRenderCharCount,
        "calculatedRenderCharCount was %d, but actually wrote %lu chars! "
        "Exiting.\n", this->calculatedRenderCharCount, strlen(out));
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

// @unused
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

void
elemNodeFreeProps(ElemNode *this) {
    if (this->children.length) nodeRefArrayFreeProps(&this->children);
    FREE_STR(this->tagName);
    ElemProp *cur = this->props;
    ElemProp *tmp;
    while (cur) {
        tmp = cur;
        cur = cur->next;
        FREE_STR(tmp->key);
        FREE_STR(tmp->val);
        FREE(ElemProp, tmp);
    }
}

ElemProp*
elemNodeGetProp(ElemNode *this, const char *key) {
    ElemProp *cur = this->props;
    while (cur) {
        if (strcmp(cur->key, key) == 0) return cur;
        cur = cur->next;
    }
    return NULL;
}

ElemProp*
elemPropCreate(const char *key, const char *value) {
    ElemProp *out = ALLOCATE(ElemProp);
    out->key = copyString(key);
    out->val = copyString(value);
    out->next = NULL;
    return out;
}

void
textNodeFreeProps(TextNode *this) {
    FREE_STR(this->chars);
}

void elemNodeArrayInit(ElemNodeArray *this) {
    arrayInit(ElemNode, 0);
}
void elemNodeArrayPush(ElemNodeArray *this, ElemNode value) {
    arrayPush(ElemNode, value);
}
void elemNodeArrayFreeProps(ElemNodeArray *this) {
    for (unsigned i = 0; i < this->length; ++i) {
        elemNodeFreeProps(&this->values[i]);
    }
    arrayFreeProps(ElemNode);
}

void textNodeArrayInit(TextNodeArray *this) {
    arrayInit(TextNode, 1);
}
void textNodeArrayPush(TextNodeArray *this, TextNode value) {
    arrayPush(TextNode, value);
}
void textNodeArrayFreeProps(TextNodeArray *this) {
    for (unsigned i = 0; i < this->length; ++i) textNodeFreeProps(&this->values[i]);
    arrayFreeProps(TextNode);
}

void nodeRefArrayInit(NodeRefArray *this) {
    arrayInit(unsigned, 1);
}
void nodeRefArrayPush(NodeRefArray *this, unsigned value) {
    arrayPush(unsigned, value);
}
void nodeRefArrayFreeProps(NodeRefArray *this) {
    arrayFreeProps(unsigned);
}
