#pragma once

#include "app-context.hpp"
#include "db.hpp"
#include "dom-tree.hpp"
#include "duk.hpp"

/**
 * Implements @native methods of common-services.js (
 *    - db.insert()
 *    - db.select()
 *    - DomTree()
 *    - DomTree.prototype.createElement()
 *    - DomTree.prototype.render()
 * ) */
void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt);
