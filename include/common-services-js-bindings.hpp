#pragma once

#include "common-services.hpp"
#include "app-env.hpp"
#include "db.hpp"
#include "dom-tree.hpp"
#include "duk.hpp"
#include "my-fs.hpp"
#include "js-environment-stash.hpp"
#include "static-data.hpp"

/**
 * Implements @native methods of common-services.js (
 *    - Db()
 *    - Db.prototype.insert()
 *    - Db.prototype.select()
 *    - Db.prototype.update()
 *    - Db.prototype.delete()
 *    - fs.write()
 *    - fs.read()
 *    - fs.readDir()
 *    - fs.makeDirs()
 *    - transpiler.transpileToFn()
 *    - Uploader()
 *    - Uploader.prototype.uploadString()
 *    - Uploader.prototype.uploadFile()
 *    - Uploader.prototype.delete()
 *    - DomTree()
 *    - DomTree.prototype.createElement()
 *    - DomTree.prototype.render()
 *    - DomTree.prototype.getRenderedElements()
 *    - DomTree.prototype.getRenderedFnComponents()
 *    - fileWatcher.watch()
 *    - fileWatcher.stop()
 * ) */
void
commonServicesJsModuleInit(duk_context *ctx, const int exportsIsAt);

/**
 * Returns the c pointer that's stored to $dukApiStack[$thisIsAt].
 */
Db*
commonServicesGetDbSelfPtr(duk_context *ctx, int thisIsAt);