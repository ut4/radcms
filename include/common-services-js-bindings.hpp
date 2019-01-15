#pragma once

#include "../c-libs/jsx/include/jsx-transpiler.hpp"
#include "app-context.hpp"
#include "db.hpp"
#include "dom-tree.hpp"
#include "duk.hpp"
#include "my-fs.hpp"
#include "js-environment-stash.hpp"

/**
 * Implements @native methods of common-services.js (
 *    - db.insert()
 *    - db.select()
 *    - db.update()
 *    - db.delete()
 *    - fs.write()
 *    - fs.read()
 *    - fs.makeDirs()
 *    - transpiler.transpileToFn()
 *    - DomTree()
 *    - DomTree.prototype.createElement()
 *    - DomTree.prototype.render()
 *    - DomTree.prototype.getRenderedFnComponents()
 * ) */
void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt);

/**
 * Forwards events to (common-services.js)fileWatcher._watchFn().
 */
void
commonServicesCallJsFWFn(FWEventType type, const char *fileName, void *myPtr);
