cmake_minimum_required(VERSION 3.9.4)
project(insanecms VERSION 0.0.0 LANGUAGES C)

set(INSN_COMPILE_OPTIONS -Wall -pedantic)
set(VENDOR_ROOT ${PROJECT_SOURCE_DIR}/vendor)
include(deps.cmake)
include_directories(pike ${INSN_DEP_INCLUDES})

# == insane.exe ================================================================
set(SOURCE_FILES_COMMON
    include/web/website.h src/web/website.c
    include/common.h
    include/data-queries.h src/data-queries.c
    include/data-query-script-bindings.h src/data-query-script-bindings.c
    include/db.h src/db.c
    include/duk.h src/duk.c
    include/file-io.h src/file-io.c
    include/memory.h src/memory.c
    include/site-ini.h src/site-ini.c
    include/v-tree-script-bindings.h src/v-tree-script-bindings.c
    include/v-tree.h src/v-tree.c
    include/str-reader.h src/str-reader.c
)
set(SOURCE_FILES_WEB
    include/web/website-handlers.h src/web/website-handlers.c
    include/web-app-common.h
    include/web-app.h src/web-app.c
)
add_executable(insane ${SOURCE_FILES_COMMON} ${SOURCE_FILES_WEB} main.c)
target_compile_options(insane PUBLIC ${INSN_COMPILE_OPTIONS})
target_link_libraries(insane ${INSN_DEP_LIBS})

# == tests.exe =================================================================
set(TESTS_FILES
    tests/test-utils.h tests/test-utils.c
    tests/testlib.h
    tests/data-query-tests.h tests/data-query-tests.c
    tests/site-graph-tests.h tests/site-graph-tests.c
    tests/v-tree-script-bindings-tests.h tests/v-tree-script-bindings-tests.c
    tests/v-tree-tests.h tests/v-tree-tests.c
    tests/website-mapper-tests.h tests/website-mapper-tests.c
)
add_executable(tests ${SOURCE_FILES_COMMON} ${TESTS_FILES} tests-main.c)
target_compile_options(tests PUBLIC ${INSN_COMPILE_OPTIONS})
target_link_libraries(tests duktape inih sqlite3)