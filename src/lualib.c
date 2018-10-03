#include "../include/lualib.h"

static char VTreeRegKey;
static char DocumentDataConfigRegKey;
static char DataBatchConfigRegKey;

static int VTreeRegisterNode(lua_State *L);
static int VTreeToString(lua_State *L);
//
/*static void pushVNode(lua_State *L, VNode *vNode);
static VNode *toVNode(lua_State *L, int argIndex);*/
//
static int DocumentDataConfigRenderAll(lua_State *L);
static int DocumentDataConfigRenderOne(lua_State *L);
static int DocumentDataConfigToString(lua_State *L);
//
static int DataBatchConfigOrderBy(lua_State *L);
static int DataBatchConfigUsing(lua_State *L);
static int DataBatchConfigWhere(lua_State *L);
static int DataBatchConfigToString(lua_State *L);

void luaLibLoad(lua_State *L) {
    // -- Vtree --
    const luaL_Reg VTree[] = {
        {"e", VTreeRegisterNode},
        {"__tostring", VTreeToString},
        {NULL, NULL}
    };
    lua_pushlightuserdata(L, (void*)&VTreeRegKey);
    luaL_newlib(L, VTree);
    lua_pushvalue(L, -1);
    lua_setfield(L, -1, "__index");
    lua_settable(L, LUA_REGISTRYINDEX);
    // -- DocumentDataConfig --
    const luaL_Reg DocumentDataConfig[] = {
        {"renderAll", DocumentDataConfigRenderAll},
        {"renderOne", DocumentDataConfigRenderOne},
        {"__tostring", DocumentDataConfigToString},
        {NULL, NULL}
    };
    lua_pushlightuserdata(L, (void*)&DocumentDataConfigRegKey);
    luaL_newlib(L, DocumentDataConfig);
    lua_pushvalue(L, -1);
    lua_setfield(L, -1, "__index");
    lua_settable(L, LUA_REGISTRYINDEX);
    // -- DataBatchConfig --
    const luaL_Reg DataBatchConfig[] = {
        {"orderBy", DataBatchConfigOrderBy},
        {"where", DataBatchConfigWhere},
        {"using", DataBatchConfigUsing},
        {"__tostring", DataBatchConfigToString},
        {NULL, NULL}
    };
    lua_pushlightuserdata(L, (void*)&DataBatchConfigRegKey);
    luaL_newlib(L, DataBatchConfig);
    lua_pushvalue(L, -1);
    lua_setfield(L, -1, "__index");
    lua_settable(L, LUA_REGISTRYINDEX);
}

//
void pushVTree(lua_State *L, VTree *vTree) {
    VTree** ptrToVTree = (VTree**)lua_newuserdata(L, sizeof(VTree*));
    *ptrToVTree = vTree;
    lua_pushlightuserdata(L, (void*)&VTreeRegKey);
    lua_gettable(L, LUA_REGISTRYINDEX);
    lua_setmetatable(L, -2);
}
static VTree *toVTree(lua_State *L, int argIndex) {
    VTree **ptrToVTree = (VTree**)lua_touserdata(L, argIndex);
    luaL_argcheck(L, ptrToVTree != NULL, 1, "'VTree**' expected");
    return *ptrToVTree;
}
static char *copyString(const char *luaManagedStr) {
    int len = strlen(luaManagedStr);
    char* out = ALLOCATE(char, len + 1);
    memcpy(out, luaManagedStr, len);
    out[len] = '\0';
    return out;
}
static int VTreeRegisterNode(lua_State *L) {
    VTree *self = toVTree(L, 1);                  // Arg 1 (self)
    char *tagName = copyString(luaL_checkstring(L, 2)); // Arg 2 (tagName)
    Props *props = ALLOCATE(Props, 1); // todo    // Arg 3 (props)
    NodeContent *nodeContent = ALLOCATE(NodeContent, 1);
    switch (lua_type(L, 4)) {                     // Arg 4 (content/children)
        /*
         * e("h1", nil, "Hello")
         */
        case LUA_TSTRING:
            nodeContentInit(nodeContent, NODE_CONTENT_STRING, copyString(lua_tostring(L, 4)));
            break;
        /*
         * e("ul", nil, {e("li"...), e("li"...)...})
         */
        case LUA_TTABLE: {
            VNodeRefArray *nodeRefArr = ALLOCATE(VNodeRefArray, 1);
            vNodeRefArrayInit(nodeRefArr);
            size_t tableSize = lua_rawlen(L, 4);
            for (size_t i = 1; i <= tableSize; ++i) {
                lua_geti(L, 4, i); // table[i] is now at the top of the stack
                vNodeRefArrayPush(nodeRefArr, (int)lua_tointeger(L, -1));
            }
            nodeContentInit(nodeContent, NODE_CONTENT_NODE_REF_ARR, nodeRefArr);
            lua_pop(L, tableSize);
            break;
        }
        /*
         * e("div", nil, e("p"...))
         */
        case LUA_TNUMBER: {
            int nodeId = lua_tointeger(L, 4);
            nodeContentInit(nodeContent, NODE_CONTENT_NODE_REF, (void*)nodeId);
            break;
        } default:
            luaL_error(L, "Arg3 should be a string or a table.\n");
            return 0;
    }
    VNode *newNode = vTreeRegisterNode(self, tagName, props, nodeContent);
    lua_pushinteger(L, newNode->id);
    return 1;
}
static int VTreeToString(lua_State *L) {
    lua_pushstring(L, "VTree{todo}");
    return 1;
}

//
/*void pushVNode(lua_State *L, VNode *vNode) {
    VNode** ptrToVNode = (VNode**)lua_newuserdata(L, sizeof(VNode*));
    *ptrToVNode = vNode;
}
static VNode *toVNode(lua_State *L, int argIndex) {
    VNode **ptrToVNode = (VNode**)lua_touserdata(L, argIndex);
    luaL_argcheck(L, ptrToVNode != NULL, 1, "'VNode**' expected");
    VNode *out =  *ptrToVNode;
    printf("pulled vnode: ");
    printf("%s\n", out->tagName);
    return out;
}*/

//
void pushDocumentDataConfig(lua_State *L, DocumentDataConfig *ddc) {
    DocumentDataConfig** ptrToDdc = (DocumentDataConfig**)lua_newuserdata(L, sizeof(DocumentDataConfig*));
    *ptrToDdc = ddc;
    lua_pushlightuserdata(L, (void*)&DocumentDataConfigRegKey);
    lua_gettable(L, LUA_REGISTRYINDEX);
    lua_setmetatable(L, -2);
}
static int DocumentDataConfigRenderAll(lua_State *L) {
    return 0;
}
static int DocumentDataConfigRenderOne(lua_State *L) {
    return 0;
}
static int DocumentDataConfigToString(lua_State *L) {
    lua_pushstring(L, "DocumentDataConfig{todo}");
    return 1;
}


static int DataBatchConfigOrderBy(lua_State *L) {
    return 0;
}
static int DataBatchConfigUsing(lua_State *L) {
    return 0;
}
static int DataBatchConfigWhere(lua_State *L) {
    return 0;
}
static int DataBatchConfigToString(lua_State *L) {
    lua_pushstring(L, "DataBatchConfig{todo}");
    return 1;
}
