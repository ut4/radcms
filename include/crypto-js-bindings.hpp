#pragma once

#include <openssl/sha.h>
#include "duk.hpp"
#include "js-environment-stash.hpp"

/**
 * Implements @native methods of crypto.js (
 *    - sha1()
 * ) */
void
cryptoJsModuleInit(duk_context *ctx, const int exportsIsAt);
