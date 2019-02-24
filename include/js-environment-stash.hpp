#pragma once

#include <cassert>
#include "app-env.hpp"
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
 * Puts AppEnv to a duktape stash.
 */
void
jsEnvironmentPutAppEnv(duk_context *ctx, AppEnv* env, const int stashIsAt);

/**
 * Retrieves AppEnv from a duktape stash.
 */
AppEnv*
jsEnvironmentPullAppEnv(duk_context *ctx, const int stashIsAt);
