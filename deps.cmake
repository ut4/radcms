# Requires VENDOR_ROOT, INSN_IS_WIN|INSN_IS_LINUX
# Defines INSN_DEP_INCLUDES, INSN_DEP_LIBS

# -- inih ----
add_library(inih STATIC ${VENDOR_ROOT}/inih/ini.c)

# -- cjson ----
add_library(cjson SHARED ${VENDOR_ROOT}/cjson/cJSON.c)

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

    # -- sqlite ----
    add_library(sqlite3 SHARED IMPORTED)
    set_target_properties(sqlite3 PROPERTIES
        IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/sqlite3.dll
    )

    # -- curl ----
    add_library(curl SHARED IMPORTED)
    set_target_properties(curl PROPERTIES
        IMPORTED_IMPLIB ${CMAKE_BINARY_DIR}/libcurl-x64.dll
    )

    set(INSN_DEP_INCLUDES
        ${VENDOR_ROOT}/microhttpd/include
        ${VENDOR_ROOT}/duktape
        ${VENDOR_ROOT}/inih
        ${VENDOR_ROOT}/sqlite3
        ${VENDOR_ROOT}/openssl
        ${VENDOR_ROOT}/curl
        ${VENDOR_ROOT}/cjson
        ${VENDOR_ROOT}/rapidxml
    )
    set(INSN_DEP_LIBS
        microhttpd
        duktape
        inih
        sqlite3
        curl
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

    # -- sqlite provided by libsqlite3-dev ----

    # -- openssl & crypto provided by libssl-dev ----
    # -- curl provided by libcurl4-openssl-dev ----

    set(INSN_DEP_INCLUDES
        ${VENDOR_ROOT}/duktape
        ${VENDOR_ROOT}/inih
        ${VENDOR_ROOT}/cjson
        ${VENDOR_ROOT}/rapidxml
    )
    set(INSN_DEP_LIBS
        m
        pthread
        microhttpd
        duktape
        inih
        sqlite3
        crypto
        ssl
        curl
        cjson
    )
else()
    message(FATAL_ERROR "INSN_IS_WIN or INSN_IS_LINUX must be SET() before including deps.cmake.")
endif()