#pragma once

#include <cassert>
#include <string>
#include "http-js-bindings.hpp"
#include "app-context.hpp"
#include "common-services-js-bindings.hpp"
#include "crypto-js-bindings.hpp"
#include "duk.hpp"
#include "my-fs.hpp"
#include "js-environment-stash.hpp"
#include "website-js-bindings.hpp"
#include "xml-reader-js-bindings.hpp"

/**
 * Configures global.require() (Duktape.modSearch()).
 */
void
jsEnvironmentConfigure(duk_context *ctx, AppContext *appContext);
