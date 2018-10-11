# Requires VENDOR_ROOT
# Defines INSN_DEP_INCLUDES, INSN_DEP_LIBS

# -- microhttpd ----
add_library(microhttpd SHARED IMPORTED)
set_target_properties(microhttpd PROPERTIES
    IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/libmicrohttpd-12.dll
)

# -- lua ----
add_library(lua SHARED IMPORTED)
set_target_properties(lua PROPERTIES
    IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/lua53.dll
)

# -- inih ----
add_library(inih STATIC ${VENDOR_ROOT}/inih/ini.c)

# -- sqlite ----
add_library(sqlite3 SHARED IMPORTED)
set_target_properties(sqlite3 PROPERTIES
    IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/sqlite3.dll
)

set(INSN_DEP_INCLUDES
    ${VENDOR_ROOT}/microhttpd/include
    ${VENDOR_ROOT}/lua/include
    ${VENDOR_ROOT}/inih
    ${VENDOR_ROOT}/sqlite3
)
set(INSN_DEP_LIBS
    microhttpd
    lua
    inih
    sqlite3
)