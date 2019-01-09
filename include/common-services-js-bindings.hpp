#pragma once

#include <jsx-transpiler.hpp>
#include "app-context.hpp"
#include "db.hpp"
#include "dom-tree.hpp"
#include "duk.hpp"
#include "my-fs.hpp"

/**
 * Implements @native methods of common-services.js (
 *    - db.insert()
 *    - db.select()
 *    - db.update()
 *    - db.delete()
 *    - fs.read()
 *    - transpiler.transpileToFn
 *    - DomTree()
 *    - DomTree.prototype.createElement()
 *    - DomTree.prototype.render()
 * ) */
void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt);
