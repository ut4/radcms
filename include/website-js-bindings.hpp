#pragma once

#include <ini.h> // ini_parse
#include "duk.hpp"
#include "js-environment-stash.hpp"

/**
 * Implements @native methods of website.js (
 *    - siteConfig.loadFromDisk()
 * ) */
void
websiteJsModuleInit(duk_context *ctx, const int exportsIsAt);
