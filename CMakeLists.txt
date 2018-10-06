cmake_minimum_required(VERSION 3.9.4)
project(rad3 VERSION 0.0.0 LANGUAGES C)

set(RAD3_COMPILE_OPTIONS -Wall -pedantic)
set(VENDOR_ROOT ${PROJECT_SOURCE_DIR}/vendor)
include(deps.cmake)
include_directories(pike ${RAD3_DEP_INCLUDES})

# == gen.exe ===================================================================
set(SOURCE_FILES
    include/data-access.h src/data-access.c
    include/generating.h src/generating.c
    include/lua.h src/lua.c
    include/lualib.h src/lualib.c
    include/memory.h src/memory.c
    include/templating.h src/templating.c
    include/vtree.h src/vtree.c
    include/web-common.h src/web-common.c
    include/web.h src/web.c
    include/api/component.h src/api/component.c
)
add_executable(gen ${SOURCE_FILES} main.c)
target_compile_options(gen PUBLIC ${RAD3_COMPILE_OPTIONS})
target_link_libraries(gen ${RAD3_DEP_LIBS})