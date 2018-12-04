cmake_minimum_required(VERSION 3.9.4)
project(insanecms VERSION 0.0.0 LANGUAGES C)

if (WIN32)
    set(INSN_COMPILE_OPTIONS -Wall -pedantic -DINSN_IS_WIN -D__USE_MINGW_ANSI_STDIO)
    set(INSN_IS_WIN "yesItIs")
elseif(UNIX)
    set(INSN_COMPILE_OPTIONS -Wall -pedantic -DINSN_IS_LINUX)
    set(INSN_IS_LINUX "yesItIs")
endif()

set(VENDOR_ROOT ${PROJECT_SOURCE_DIR}/vendor)
include(deps.cmake)
include_directories(insane ${INSN_DEP_INCLUDES})

# == insane.exe ================================================================
set(SOURCE_FILES_COMMON
    include/common.h
    include/common-script-bindings.h src/common-script-bindings.c
    include/component-mapper.h src/component-mapper.c
    include/data-defs.h src/data-defs.c
    include/data-def-script-bindings.h src/data-def-script-bindings.c
    include/data-queries.h src/data-queries.c
    include/data-query-script-bindings.h src/data-query-script-bindings.c
    include/db.h src/db.c
    include/directive-script-bindings.h src/directive-script-bindings.c
    include/duk.h src/duk.c
    include/file-io.h src/file-io.c
    include/hashmap.h src/hashmap.c
    include/memory.h src/memory.c
    include/site-graph.h src/site-graph.c
    include/site-ini.h src/site-ini.c
    include/static-data.h src/static-data.c
    include/str-reader.h src/str-reader.c
    include/timer.h
    include/v-tree-script-bindings.h src/v-tree-script-bindings.c
    include/v-tree.h src/v-tree.c
    include/website-fw-handlers.h src/website-fw-handlers.c
    include/website.h src/website.c
)
set(SOURCE_FILES_WEB
    include/file-watcher.h src/file-watcher.c
    include/web/component-handlers.h src/web/component-handlers.c
    include/web/core-handlers.h src/web/core-handlers.c
    include/web/web-app-common.h
    include/web/web-app.h src/web/web-app.c
    include/web/website-handlers.h src/web/website-handlers.c
)
add_executable(insane ${SOURCE_FILES_COMMON} ${SOURCE_FILES_WEB} main.c)
target_compile_options(insane PUBLIC ${INSN_COMPILE_OPTIONS})
target_link_libraries(insane ${INSN_DEP_LIBS})

# == tests.exe =================================================================
set(TESTS_FILES
    tests/common-script-bindings-tests.h tests/common-script-bindings-tests.c
    tests/component-mapper-tests.h tests/component-mapper-tests.c
    tests/test-utils.h tests/test-utils.c
    tests/testlib.h
    tests/data-query-tests.h tests/data-query-tests.c
    tests/file-io-tests.h tests/file-io-tests.c
    tests/site-graph-tests.h tests/site-graph-tests.c
    tests/v-tree-script-bindings-tests.h tests/v-tree-script-bindings-tests.c
    tests/v-tree-tests.h tests/v-tree-tests.c
    tests/website-diff-tests.h tests/website-diff-tests.c
    tests/website-mapper-tests.h tests/website-mapper-tests.c
)
add_executable(tests ${SOURCE_FILES_COMMON} ${TESTS_FILES} tests-main.c)
target_compile_options(tests PUBLIC ${INSN_COMPILE_OPTIONS})
target_link_libraries(tests duktape inih sqlite3 cjson)