#pragma once

#include <ini.h> // ini_parse
#include "duk.hpp"
#include "common-services-js-bindings.hpp"

/**
 * Implements @native methods of website.js (
 *    - Website.prototype.install()
 *    - SiteConfig.prototype.loadFromDisk()
 * ) */
void
websiteJsModuleInit(duk_context *ctx, const int exportsIsAt);
