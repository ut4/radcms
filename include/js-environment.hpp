#pragma once

#include <cassert>
#include <string>
#include "app-context.hpp"
#include "common-services-js-bindings.hpp"
#include "duk.hpp"
#include "my-fs.hpp"

/**
 * Configures global.require() (Duktape.modSearch()).
 */
void
jsEnvironmentConfigure(duk_context *ctx, AppContext *appContext);

/**
 * Pushes require($moduleId).exports[$propName] (or null) to the stack.
 */
void
jsEnvironmentPushModuleProp(duk_context *ctx, const char *moduleId,
                            const char *propName);

/**
 * Pushes require('common-services.js')[$servicename] (or null) to the stack.
 */
void
jsEnvironmentPushCommonService(duk_context *ctx, const char *serviceName);