#pragma once

#include <ini.h> // ini_parse
#include "duk.hpp"
#include "common-services-js-bindings.hpp"
#include "static-data.hpp"

/**
 * Implements @native methods of website.js (
 *    - SiteConfig.prototype.loadFromDisk()
 * ) */
void
websiteJsModuleInit(duk_context *ctx, const int exportsIsAt);
