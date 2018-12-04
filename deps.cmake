# Requires VENDOR_ROOT, INSN_IS_WIN|INSN_IS_LINUX
# Defines INSN_DEP_INCLUDES, INSN_DEP_LIBS

if (INSN_IS_WIN)
    # -- microhttpd ----
    add_library(microhttpd SHARED IMPORTED)
    set_target_properties(microhttpd PROPERTIES
        IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/libmicrohttpd-12.dll
    )

    # -- duktape ----
    add_library(duktape SHARED
        ${VENDOR_ROOT}/duktape/duktape.c
        ${VENDOR_ROOT}/duktape/duk_module_duktape.c
    )

    # -- inih ----
    add_library(inih STATIC ${VENDOR_ROOT}/inih/ini.c)

    # -- sqlite ----
    add_library(sqlite3 SHARED IMPORTED)
    set_target_properties(sqlite3 PROPERTIES
        IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/sqlite3.dll
    )

    # -- cjson ----
    add_library(cjson SHARED ${VENDOR_ROOT}/cjson/cJSON.c)

    set(INSN_DEP_INCLUDES
        ${VENDOR_ROOT}/microhttpd/include
        ${VENDOR_ROOT}/duktape
        ${VENDOR_ROOT}/inih
        ${VENDOR_ROOT}/sqlite3
        ${VENDOR_ROOT}/cjson
    )
    set(INSN_DEP_LIBS
        microhttpd
        duktape
        inih
        sqlite3
        cjson
    )
elseif(INSN_IS_LINUX)
    # -- microhttpd provided by libmicrohttpd-dev ----

    # -- duktape ----
    add_library(duktape SHARED
        ${VENDOR_ROOT}/duktape/duktape.c
        ${VENDOR_ROOT}/duktape/duk_module_duktape.c
    )
    target_link_libraries(duktape m) # m = math

    # -- inih ----
    add_library(inih STATIC ${VENDOR_ROOT}/inih/ini.c)

    # -- sqlite provided by libsqlite3-dev ----

    # -- cjson ----
    add_library(cjson SHARED ${VENDOR_ROOT}/cjson/cJSON.c)

    set(INSN_DEP_INCLUDES
        ${VENDOR_ROOT}/duktape
        ${VENDOR_ROOT}/inih
        ${VENDOR_ROOT}/cjson
    )
    set(INSN_DEP_LIBS
        m
        pthread
        microhttpd
        duktape
        inih
        sqlite3
        cjson
    )
else()
    message(FATAL_ERROR "INSN_IS_WIN or INSN_IS_LINUX must be SET() before including deps.cmake.")
endif()