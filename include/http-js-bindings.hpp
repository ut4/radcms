#pragma once

#include "../c-libs/jsx/include/jsx-transpiler.hpp"
#include "duk.hpp"
#include "web-app.hpp" // MHD_Connection
#include "js-environment-stash.hpp"

/**
 * Implements @native methods of http.js (
 *    - Request.prototype.getUrlParam()
 * ) */
void
httpJsModuleInit(duk_context *ctx, const int exportsIsAt);

void
httpJsBindingsPushNewRequest(duk_context *ctx, struct MHD_Connection *conn,
                             const char *url, const char *method);
