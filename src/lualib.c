#include "../include/lualib.h"

static char VTreeBindingsRegKey;
static char DocumentDataConfigBindingsRegKey;
static char DataBatchConfigBindingsRegKey;

static int luaVTreeRegisterNode(lua_State *L);
static int luaVTreeToString(lua_State *L);
//
static int luaDocumentDataConfigRenderAll(lua_State *L);
static int luaDocumentDataConfigRenderOne(lua_State *L);
static int luaDocumentDataConfigToString(lua_State *L);
//
static void luaPushDataBatchConfig(lua_State *L, DataBatchConfig *bdc);
static DataBatchConfig *luaToDataBatchConfig(lua_State *L, int argIndex);
static int luaDataBatchConfigOrderBy(lua_State *L);
static int luaDataBatchConfigUsing(lua_State *L);
static int luaDataBatchConfigWhere(lua_State *L);
static int luaDataBatchConfigToString(lua_State *L);

void luaLibLoad(lua_State *L) {
    // -- Vtree --
    const luaL_Reg VTreeBindings[] = {
        {"e", luaVTreeRegisterNode},
        {"__tostring", luaVTreeToString},
        {NULL, NULL}
    };
    lua_pushlightuserdata(L, (void*)&VTreeBindingsRegKey);
    luaL_newlib(L, VTreeBindings);
    lua_pushvalue(L, -1);
    lua_setfield(L, -1, "__index");
    lua_settable(L, LUA_REGISTRYINDEX);
    // -- DocumentDataConfig --
    const luaL_Reg DocumentDataConfigBindings[] = {
        {"renderAll", luaDocumentDataConfigRenderAll},
        {"renderOne", luaDocumentDataConfigRenderOne},
        {"__tostring", luaDocumentDataConfigToString},
        {NULL, NULL}
    };
    lua_pushlightuserdata(L, (void*)&DocumentDataConfigBindingsRegKey);
    luaL_newlib(L, DocumentDataConfigBindings);
    lua_pushvalue(L, -1);
    lua_setfield(L, -1, "__index");
    lua_settable(L, LUA_REGISTRYINDEX);
    // -- DataBatchConfig --
    const luaL_Reg DataBatchConfigBindings[] = {
        {"orderBy", luaDataBatchConfigOrderBy},
        {"where", luaDataBatchConfigWhere},
        {"using", luaDataBatchConfigUsing},
        {"__tostring", luaDataBatchConfigToString},
        {NULL, NULL}
    };
    lua_pushlightuserdata(L, (void*)&DataBatchConfigBindingsRegKey);
    luaL_newlib(L, DataBatchConfigBindings);
    lua_pushvalue(L, -1);
    lua_setfield(L, -1, "__index");
    lua_settable(L, LUA_REGISTRYINDEX);
}

//
void luaPushVTree(lua_State *L, VTree *vTree) {
    VTree** ptrToVTree = (VTree**)lua_newuserdata(L, sizeof(VTree*));
    *ptrToVTree = vTree;
    lua_pushlightuserdata(L, (void*)&VTreeBindingsRegKey);
    lua_gettable(L, LUA_REGISTRYINDEX);
    lua_setmetatable(L, -2);
}
static VTree *luaToVTree(lua_State *L, int argIndex) {
    VTree **ptrToVTree = (VTree**)lua_touserdata(L, argIndex);
    luaL_argcheck(L, ptrToVTree != NULL, 1, "'VTree**' expected");
    return *ptrToVTree;
}
static int luaVTreeRegisterNode(lua_State *L) {
    VTree *self = luaToVTree(L, 1);                     // Arg 1 (self)
    char *tagName = copyString(luaL_checkstring(L, 2)); // Arg 2 (tagName)
    Props *props = ALLOCATE(Props, 1); // todo          // Arg 3 (props)
    NodeContent *nodeContent = ALLOCATE(NodeContent, 1);
    switch (lua_type(L, 4)) {                           // Arg 4 (content/children)
        /*
         * e("h1", nil, "Hello")
         */
        case LUA_TSTRING:
            nodeContentInitWithStr(nodeContent, copyString(lua_tostring(L, 4)));
            break;
        /*
         * e("ul", nil, {e("li"...), e("li"...)...})
         *   - or -
         * e("div", nil, {renderAll(...),...})
         */
        case LUA_TTABLE: {
            size_t tableSize = lua_rawlen(L, 4);
            lua_geti(L, 4, 1); // push table[0] to the top of the stack
            if (lua_type(L, -1) == LUA_TNUMBER) { // e(..., {e(..)..})
                VNodeRefArray *nodeRefArr = ALLOCATE(VNodeRefArray, 1);
                vNodeRefArrayInit(nodeRefArr);
                vNodeRefArrayPush(nodeRefArr, (int)lua_tointeger(L, -1));
                for (size_t i = 2; i <= tableSize; ++i) {
                    lua_geti(L, 4, i); // table[i] is now at the top of the stack
                    vNodeRefArrayPush(nodeRefArr, (int)lua_tointeger(L, -1));
                }
                nodeContentInitWithNodeRefArr(nodeContent, nodeRefArr);
            } else if (lua_type(L, -1) == LUA_TUSERDATA) { // e(..., {renderAll(..)..})
                DataBatchConfigRefListNode *rn = ALLOCATE(DataBatchConfigRefListNode, 1);
                rn->ref = luaToDataBatchConfig(L, -1);
                rn->next = NULL;
                DataBatchConfigRefListNode *n = rn;
                for (size_t i = 2; i <= tableSize; ++i) {
                    lua_geti(L, 4, i);
                    DataBatchConfigRefListNode *nn = ALLOCATE(DataBatchConfigRefListNode, 1);
                    nn->ref = luaToDataBatchConfig(L, -1);
                    n->next = nn;
                    n = n->next;
                    n->next = NULL;
                }
                nodeContentInitWithDbcArr(nodeContent, rn);
            }
            lua_pop(L, tableSize);
            break;
        }
        /*
         * e("div", nil, e("p"...))
         */
        case LUA_TNUMBER:
            nodeContentInitWithNodeRef(nodeContent, (int)lua_tointeger(L, 4));
            break;
        /*
         * e("div", nil, renderAll|One(...))
         */
        case LUA_TUSERDATA:
            nodeContentInitWithDbc(nodeContent, luaToDataBatchConfig(L, 4));
            break;
        default:
            luaL_error(L, "Arg3 should be a string or a table.\n");
            return 0;
    }
    VNode *newNode = vTreeRegisterNode(self, tagName, props, nodeContent);
    lua_pushinteger(L, newNode->id); // Return value (id of the registered node)
    return 1;
}
static int luaVTreeToString(lua_State *L) {
    lua_pushstring(L, "VTree{todo}");
    return 1;
}

//
void luaPushDocumentDataConfig(lua_State *L, DocumentDataConfig *ddc) {
    DocumentDataConfig** ptrToDdc = (DocumentDataConfig**)lua_newuserdata(L, sizeof(DocumentDataConfig*));
    *ptrToDdc = ddc;
    lua_pushlightuserdata(L, (void*)&DocumentDataConfigBindingsRegKey);
    lua_gettable(L, LUA_REGISTRYINDEX);
    lua_setmetatable(L, -2);
}
static DocumentDataConfig *luaToDocumentDataConfig(lua_State *L, int argIndex) {
    DocumentDataConfig **ptrToDocumentDataConfig = (DocumentDataConfig**)lua_touserdata(L, argIndex);
    luaL_argcheck(L, ptrToDocumentDataConfig != NULL, 1, "'DocumentDataConfig**' expected");
    return *ptrToDocumentDataConfig;
}
static int luaDocumentDataConfigRenderAll(lua_State *L) {
    DocumentDataConfig *self = luaToDocumentDataConfig(L, 1); // Arg 1 (self)
    const char *contentType = luaL_checkstring(L, 2);         // Arg2 (contentType)
    DataBatchConfig *newBatchConfig = documentDataConfigRenderAll(self, contentType);
    luaPushDataBatchConfig(L, newBatchConfig); // Return value (inserted dataBatchConfig)
    return 1;
}
static int luaDocumentDataConfigRenderOne(lua_State *L) {
    DocumentDataConfig *self = luaToDocumentDataConfig(L, 1); // Arg 1 (self)
    const char *contentType = luaL_checkstring(L, 2);         // Arg2 (contentType)
    DataBatchConfig *newBatchConfig = documentDataConfigRenderOne(self, contentType);
    luaPushDataBatchConfig(L, newBatchConfig); // Return value (inserted dataBatchConfig)
    return 1;
}
static int luaDocumentDataConfigToString(lua_State *L) {
    lua_pushstring(L, "DocumentDataConfig{todo}");
    return 1;
}

static void luaPushDataBatchConfig(lua_State *L, DataBatchConfig *bdc) {
    DataBatchConfig** ptrToBdc = (DataBatchConfig**)lua_newuserdata(L, sizeof(DataBatchConfig*));
    *ptrToBdc = bdc;
    lua_pushlightuserdata(L, (void*)&DataBatchConfigBindingsRegKey);
    lua_gettable(L, LUA_REGISTRYINDEX);
    lua_setmetatable(L, -2);
}
static DataBatchConfig *luaToDataBatchConfig(lua_State *L, int argIndex) {
    DataBatchConfig **ptrToDataBatchConfig = (DataBatchConfig**)lua_touserdata(L, argIndex);
    luaL_argcheck(L, ptrToDataBatchConfig != NULL, 1, "'DataBatchConfig**' expected");
    return *ptrToDataBatchConfig;
}
static int luaDataBatchConfigOrderBy(lua_State *L) {
    lua_pushvalue(L, 1); // Return value (self)
    return 1;
}
static int luaDataBatchConfigUsing(lua_State *L) {
    DataBatchConfig *self = luaToDataBatchConfig(L, 1); // Arg 1 (self)
    dataBatchConfigUsing(self, luaL_checkstring(L, 2)); // Arg 2 (name of the template)
    lua_pushvalue(L, 1);                                // Return value (self)
    return 1;
}
static int luaDataBatchConfigWhere(lua_State *L) {
    DataBatchConfig *self = luaToDataBatchConfig(L, 1); // Arg 1 (self)
    dataBatchConfigWhere(self, luaL_checkstring(L, 2)); // Arg 2 (where string)
    lua_pushvalue(L, 1);                                // Return value (self)
    return 1;
}
static int luaDataBatchConfigToString(lua_State *L) {
    lua_pushstring(L, "DataBatchConfig{todo}");
    return 1;
}
