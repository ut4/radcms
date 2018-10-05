#include "../include/lua.h"

void *myLuaAlloc(void *ud, void *ptr, size_t osize, size_t nsize) {
    (void)ud;    /* not used */
    (void)osize; /* not used */
    return reallocate(ptr, osize, nsize);
}

lua_State *createLuaState(bool openStdLibs) {
    lua_State *L = lua_newstate(myLuaAlloc, NULL);
    if (!L) { return NULL; }
    if (openStdLibs) luaL_openlibs(L);
    return L;
}

void configureLua(lua_State *L, const char *rootDirPath) {
    // == Enable require("somefile") ====
    lua_getglobal(L, "package");
    char *absPath = ALLOCATE(char, strlen(rootDirPath) + strlen("?.lua") + 1);
    strcat(absPath, rootDirPath);
    strcat(absPath, "?.lua");
    lua_pushstring(L, absPath);
    lua_setfield(L, -2, "path");
    lua_pop(L, 1);
    FREE(absPath);
}

void dumpLuaStack(lua_State *L) {
    int i;
    int top = lua_gettop(L);
    for (i = 1; i <= top; ++i) {
        int t = lua_type(L, i);
        switch (t) {
            case LUA_TSTRING:
                printf("%d: `%s'\n", i, lua_tostring(L, i)); break;
            case LUA_TBOOLEAN:
                printf("%d: %s\n", i, lua_toboolean(L, i) ? "true" : "false"); break;
            case LUA_TNUMBER:
                printf("%d: %g\n", i, lua_tonumber(L, i)); break;
            default:
                printf("%d: %s\n", i, lua_typename(L, t)); break;
        }
    }
}

const char *getLuaErrorDetails(lua_State *L) {
    if (lua_isstring(L, lua_gettop(L))) {
        return lua_tostring(L, lua_gettop(L));
    }
    return "";
}

bool luaUtilsLoadFnFromDisk(lua_State *L, const  char *fileName, char *err) {
    const char *path = fileName;
    int status = luaL_loadfilex(L, path, "t");// "b" (only binary chunks), "t" (only text chunks), or "bt" (both)
    switch (status) {
        case LUA_OK: return true;
        case LUA_ERRFILE: // file-related error
            sprintf(err, "Failed to compile script '%s' (LUA_ERRFILE): %s", path,
                getLuaErrorDetails(L));
            return false;
        case LUA_ERRSYNTAX: // syntax error during precompilation
            sprintf(err, "Failed to compile script '%s' (LUA_ERRSYNTAX, syntax error): %s",
                path, getLuaErrorDetails(L));
            return false;
        case LUA_ERRMEM: // memory allocation (out-of-memory) error
            sprintf(err, "Failed to compile script '%s' (LUA_ERRMEM, out-of-memory): %s",
                path, getLuaErrorDetails(L));
            return false;
        case LUA_ERRGCMM: // error while running a __gc metamethod
            sprintf(err, "Failed to compile script '%s' (LUA_ERRGCMM, gc error): %s",
                path, getLuaErrorDetails(L));
            return false;
    }
    return true;
}
