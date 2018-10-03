#ifndef rad3_lua_h
#define rad3_lua_h

#include <stdbool.h>
#include <stddef.h> // size_t
#include <lua.h>
#include <lualib.h> // luaL_openlibs
#include <lauxlib.h> // rest of the luaL_* functions
#include "memory.h" // reallocate, ALLOCATE etc.

void *myLuaAlloc(void *ud, void *ptr, size_t osize, size_t nsize);
lua_State *createLuaState(bool openStdLibs);
void dumpLuaStack(lua_State *L);
const char *getLuaErrorDetails(lua_State *L);
bool luaUtilsLoadFnFromDisk(lua_State *L, const  char *fileName, char *err);
void configureLua(lua_State *L, const char *rootDirPath);

#endif
