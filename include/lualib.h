#ifndef rad3_lualib_h
#define rad3_lualib_h

#include "data-access.h" // DocumentDataConfig etc.
#include "lua.h"
#include "vtree.h" // VTree

/*
 * Loads all lua bindings into $L.
 */
void luaLibLoad(lua_State *L);
/*
 * Pushes DocumentDataConfig userdata to the lua stack.
 */
void luaPushDocumentDataConfig(lua_State *L, DocumentDataConfig *ddc);
/*
 * Pushes VTree userdata to the lua stack.
 */
void luaPushVTree(lua_State *L, VTree *vTree);

#endif