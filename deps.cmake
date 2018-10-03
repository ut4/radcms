# Requires VENDOR_ROOT
# Defines RAD3_DEP_INCLUDES, RAD3_DEP_LIBS

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

set(RAD3_DEP_INCLUDES
    ${VENDOR_ROOT}/microhttpd/include
    ${VENDOR_ROOT}/lua/include
)
set(RAD3_DEP_LIBS
    microhttpd
    lua
)