cmake_minimum_required(VERSION 3.24)
project(nukefire_reader_bridge VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build PRISM static for the isolated NukeFire helper" FORCE)
set(PRISM_BACKEND_DEFAULT OFF CACHE STRING "Disable unrelated PRISM backends" FORCE)
set(PRISM_ENABLE_NVDA_BACKEND ON CACHE STRING "Enable direct NVDA backend" FORCE)
set(PRISM_ENABLE_JAWS_BACKEND ON CACHE STRING "Enable direct JAWS backend" FORCE)
set(PRISM_ENABLE_TESTS OFF CACHE BOOL "" FORCE)
set(PRISM_ENABLE_DEMOS OFF CACHE BOOL "" FORCE)
set(PRISM_ENABLE_GDEXTENSION OFF CACHE BOOL "" FORCE)
set(PRISM_ENABLE_SHIMS OFF CACHE BOOL "" FORCE)
set(PRISM_ENABLE_LEGACY_BACKENDS OFF CACHE BOOL "" FORCE)
set(PRISM_ENABLE_POWER_MANAGEMENT OFF CACHE BOOL "" FORCE)
set(PRISM_IPO OFF CACHE STRING "" FORCE)

include(FetchContent)
FetchContent_Declare(
  prism
  GIT_REPOSITORY https://github.com/ethindp/prism.git
  GIT_TAG v0.18.2
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(prism)

add_executable(nukefire-reader-bridge main.cpp)
target_link_libraries(nukefire-reader-bridge PRIVATE prism::prism)
target_compile_features(nukefire-reader-bridge PRIVATE cxx_std_23)

if(MSVC)
  target_compile_options(nukefire-reader-bridge PRIVATE /W4 /permissive-)
endif()
