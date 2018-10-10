cmake_minimum_required(VERSION 3.9.4)
project(insanecms VERSION 0.0.0 LANGUAGES C)

set(INSN_COMPILE_OPTIONS -Wall -pedantic)
set(VENDOR_ROOT ${PROJECT_SOURCE_DIR}/vendor)
include(deps.cmake)
include_directories(pike ${INSN_DEP_INCLUDES})

# == insane.exe ================================================================
set(SOURCE_FILES
    include/common.h
    include/file-io.h src/file-io.c
    include/memory.h src/memory.c
    include/site-ini.h src/site-ini.c
    include/web-app.h src/web-app.c
    include/website.h src/website.c
)
add_executable(insane ${SOURCE_FILES} main.c)
target_compile_options(insane PUBLIC ${INSN_COMPILE_OPTIONS})
target_link_libraries(insane ${INSN_DEP_LIBS})

# == tests.exe =================================================================
set(TESTS_FILES
    tests/testlib.h
    tests/site-graph-tests.h tests/site-graph-tests.c
)
add_executable(tests ${SOURCE_FILES} ${TESTS_FILES} tests-main.c)
target_compile_options(tests PUBLIC ${INSN_COMPILE_OPTIONS})
target_link_libraries(tests inih)