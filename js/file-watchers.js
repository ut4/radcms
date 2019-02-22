/**
 * == file-watchers.js ====
 *
 * This file implements and registers handlers for the file notifier / fswatch
 * events.
 *
 */
var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
var website = require('website.js');
var siteGraph = website.siteGraph;
var diff = require('website-diff.js');
var TEMPLATE_EXT = 'htm';
var lastRenameEventTime = 0;

exports.init = function() {
    fileWatcher.setWatchFn(handleFWEvent);
    commons.signals.listen('siteGraphRescanRequested', diff.performRescan);
};

/**
 * Receives all file events.
 *
 * @param {number} type commons.fileWatcher.EVENT_*.
 * @param {string} fileName eg. 'file.css'
 * @param {string} fileExt eg. 'css' or 'htm'
 */
function handleFWEvent(type, fileName, fileExt) {
    if (type == fileWatcher.EVENT_CREATE) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateCreateEvent(fileName);
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileCreateEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_WRITE) {
        if (fileWatcher.timer.now() - lastRenameEventTime < 100) return;
        if (fileExt == TEMPLATE_EXT)
            handleTemplateModifyEventEvent(fileName);
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileModifyEventEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_REMOVE && fileExt == TEMPLATE_EXT) {
        handleTemplateDeleteEventEvent(fileName);
    } else if (type == fileWatcher.EVENT_RENAME) {
        if (fileExt == 'css' || fileExt == 'js') {
            handleCssOrJsFileRename.apply(null, extractRenameFileNames(fileName));
            lastRenameEventTime = fileWatcher.timer.now();
        }
    }
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateCreateEvent(fileName) {
    if (!siteGraph.getTemplate(fileName)) {
        // Add the layout, and leave its .isOk to false
        siteGraph.addTemplate(fileName);
        website.saveToDb(siteGraph);
        commons.log('[Info]: ' + 'Added "' + fileName + '"');
    }
    // Skip compileAndCache()
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileCreateEvent(fileName) {
    // Register the file, and set its `isOk` to 0
    commons.db.insert('insert or replace into staticFileResources values (?,0)',
        function(stmt) {
            stmt.bindString(0, fileName);
        });
    commons.log('[Info]: ' + 'Registered "' + fileName + '"');
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateModifyEventEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        commons.log('[Debug]: An unknown template "' + fileName + '" was modified, skipping.');
        return;
    }
    if (website.website.compileAndCacheTemplate(fileName)) {
        commons.log('[Info]: Cached "' + fileName + '"');
        layout.isOk = true;
    }
    if (layout.isInUse) {
        diff.performRescan('usersOf:' + fileName);
    }
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileModifyEventEvent(fileName) {
    // Check if this file is registered (and update it's isOk)
    var numAffected = commons.db.update('update staticFileResources set \
        `isOk` = 1 where `url` = ?',
        function(stmt) { stmt.bindString(0, fileName); }
    );
    // It is -> insert or update the new checksum
    if (numAffected > 0) {
        commons.db.insert('insert or replace into uploadStatuses values \
            (?,?,(select `uphash` from uploadStatuses where `url`=?),1)', function(stmt) {
                stmt.bindString(0, fileName);
                stmt.bindString(1, website.website.readFileAndCalcChecksum(fileName));
                stmt.bindString(2, fileName);
            });
        commons.log('[Info]: Updated "' + fileName + '"');
    } else {
        commons.log('[Debug]: An unknown file "' + fileName + '" was modified, skipping.');
    }
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateDeleteEventEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        commons.log('[Debug]: An unknown template "' + fileName + '" was deleted, skipping.');
        return;
    }
    website.website.deleteAndUncacheTemplate(layout.fileName);
    website.saveToDb(siteGraph);
    commons.log('[Info]: Removed "' + fileName + '"');
}

/**
 * @param {string} from eg. 'file.js'
 * @param {string} to eg. 'renamed.js'
 */
function handleCssOrJsFileRename(from, to) {
    from = '/' + from;
    to = '/' + to;
    commons.db.insert('insert or replace into staticFileResources values\
        (?,coalesce((select `isOk` from staticFileResources where `url`=?),0))',
        function(stmt) {
            stmt.bindString(0, to);
            stmt.bindString(1, from);
        });
    commons.db.delete('delete from staticFileResources where `url` = ?',
        function(stmt) {
            stmt.bindString(0, from);
        });
    commons.db.update('update uploadStatuses set `url` = ? where `url` = ?',
        function(stmt) {
            stmt.bindString(0, to);
            stmt.bindString(1, from);
        });
}

/**
 * @param {string} joined EVENT_RENAME's half-ass value eg. file.js>/path/to/site/renamed.js
 * @returns {[string, string]} eg. ['file.ext', 'renamed.ext']
 */
function extractRenameFileNames(joined) {
    var pcs = joined.split('>');
    pcs[1] = pcs[1].substr(insnEnv.sitePath.length);
    return pcs;
}