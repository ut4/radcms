#pragma once

#include <cassert>
#include "app-context.hpp"
#include "duk.hpp"

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

/**
 * Puts AppContext to a duktape stash.
 */
void
jsEnvironmentPutAppContext(duk_context *ctx, AppContext* app, const int stashIsAt);

/**
 * Retrieves AppContext from a duktape stash.
 */
AppContext*
jsEnvironmentPullAppContext(duk_context *ctx, const int stashIsAt);
