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
set(SOURCE_FILES
    include/core-script-bindings.hpp src/core-script-bindings.cpp
    include/db.hpp
    include/duk.hpp src/duk.cpp
    include/dom-tree.hpp src/dom-tree.cpp
)
add_executable(insane ${SOURCE_FILES} main.cpp)
target_compile_options(insane PUBLIC ${INSN_COMPILE_OPTIONS})
target_compile_features(insane PUBLIC ${INSN_COMPILE_FEATURES})
target_link_libraries(insane ${INSN_DEP_LIBS})

# == tests.exe =================================================================
add_executable(tests ${SOURCE_FILES} tests-main.cpp)
target_compile_options(tests PUBLIC ${INSN_COMPILE_OPTIONS})
target_compile_features(tests PUBLIC ${INSN_COMPILE_FEATURES})
target_link_libraries(tests duktape)