#pragma once

#include "common-services-js-bindings.hpp"
#include "js-environment-stash.hpp"

/**
 * Implements @native methods of app.js (
 *    - install()
 * ) */
void
appJsModuleInit(duk_context *ctx, const int exportsIsAt);
