#ifndef rad3_lualib_h
#define rad3_lualib_h

#include "data-access.h" // DocumentDataConfig etc.
#include "lua.h"
#include "vtree.h" // VTree

void luaLibLoad(lua_State *L);
void pushDocumentDataConfig(lua_State *L, DocumentDataConfig *entityCollection);
void pushVTree(lua_State *L, VTree *vTree);

#endif