cmake_minimum_required(VERSION 3.9.4)
project(insanecms VERSION 0.0.0 LANGUAGES C CXX)

set(INSN_COMPILE_FEATURES cxx_std_17)

if (WIN32)
    set(INSN_COMPILE_OPTIONS -Wall -pedantic -DINSN_IS_WIN -D__USE_MINGW_ANSI_STDIO)
    set(INSN_IS_WIN "yesItIs")
elseif(UNIX)
    set(INSN_COMPILE_OPTIONS -Wall -pedantic -DINSN_IS_LINUX)
    set(INSN_IS_LINUX "yesItIs")
endif()

set(VENDOR_ROOT ${PROJECT_SOURCE_DIR}/vendor)
include(deps.cmake)
include_directories(${INSN_DEP_INCLUDES})

# == insane.exe ================================================================
set(C_FILES
    c-libs/fwatcher/include/file-watcher.hpp c-libs/fwatcher/src/file-watcher.c
    c-libs/jsx/include/jsx-producer.h c-libs/jsx/src/jsx-producer.c
    c-libs/jsx/include/jsx-scanner.h c-libs/jsx/src/jsx-scanner.c
    c-libs/jsx/include/jsx-transpiler.hpp c-libs/jsx/src/jsx-transpiler.c
    c-libs/jsx/include/memory.h c-libs/jsx/src/memory.c
)
set(SOURCE_FILES
    include/app-context.hpp src/app-context.cpp
    include/common-services.hpp src/common-services.cpp
    include/common-services-js-bindings.hpp src/common-services-js-bindings.cpp
    include/core-handlers.hpp src/core-handlers.cpp
    include/db.hpp src/db.cpp
    include/duk.hpp src/duk.cpp
    include/http-js-bindings.hpp src/http-js-bindings.cpp
    include/dom-tree.hpp src/dom-tree.cpp
    include/js-environment.hpp src/js-environment.cpp
    include/js-environment-stash.hpp src/js-environment-stash.cpp
    include/my-fs.hpp src/my-fs.cpp
    include/static-data.hpp src/static-data.cpp
    include/web-app.hpp src/web-app.cpp
    include/website.hpp src/website.cpp
    include/website-js-bindings.hpp src/website-js-bindings.cpp
    include/xml-reader-js-bindings.hpp src/xml-reader-js-bindings.cpp
)
add_executable(insane ${SOURCE_FILES} ${C_FILES} main.cpp)
target_compile_options(insane PUBLIC ${INSN_COMPILE_OPTIONS})
target_compile_features(insane PUBLIC ${INSN_COMPILE_FEATURES})
target_link_libraries(insane ${INSN_DEP_LIBS})

# == tests.exe =================================================================
set(TESTS_FILES tests/test-utils.hpp tests/test-utils.cpp)
add_executable(tests ${SOURCE_FILES} ${C_FILES} ${TESTS_FILES} tests-main.cpp)
target_compile_options(tests PUBLIC ${INSN_COMPILE_OPTIONS})
target_compile_features(tests PUBLIC ${INSN_COMPILE_FEATURES})
target_link_libraries(tests ${INSN_DEP_LIBS})