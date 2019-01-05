#pragma once

#include "app-context.hpp"
#include "db.hpp"
#include "duk.hpp"

/**
 * Implements @native methods of common-services.js.
 */
void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt);
