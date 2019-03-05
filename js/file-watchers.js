/**
 * == file-watchers.js ====
 *
 * This file implements and registers handlers for the file notifier / fswatch
 * events.
 *
 */
var app = require('app.js').app;
var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
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
    } else if (type == fileWatcher.EVENT_REMOVE) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateDeleteEventEvent(fileName);
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileDeleteEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_RENAME) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateRenameEvent.apply(null, extractRenameFileNames(fileName));
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileRenameEvent.apply(null, extractRenameFileNames(fileName));
        else return;
        lastRenameEventTime = fileWatcher.timer.now();
    }
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateCreateEvent(fileName) {
    commons.log('[Info]: ' + 'Noted "' + fileName + '"');
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileCreateEvent(fileName) {
    // Register the file, and set its `isOk` to 0
    app.currentWebsite.db.insert('insert or replace into staticFileResources values (?,0)',
        function(stmt) {
            stmt.bindString(0, fileName);
        });
    commons.log('[Info]: ' + 'Registered "' + fileName + '"');
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateModifyEventEvent(fileName) {
    if (app.currentWebsite.compileAndCacheTemplate(fileName)) {
        commons.log('[Info]: Cached "' + fileName + '"');
    }
    diff.performRescan('full');
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileModifyEventEvent(fileName) {
    // Check if this file is registered (and update it's isOk)
    var numAffected = app.currentWebsite.db.update('update staticFileResources set \
        `isOk` = 1 where `url` = ?',
        function(stmt) { stmt.bindString(0, fileName); }
    );
    // It is -> insert or update the new checksum
    if (numAffected > 0) {
        app.currentWebsite.db.insert('insert or replace into uploadStatuses values \
            (?,?,(select `uphash` from uploadStatuses where `url`=?),1)', function(stmt) {
                stmt.bindString(0, fileName);
                stmt.bindString(1, app.currentWebsite.readFileAndCalcChecksum(fileName));
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
    if (!commons.templateCache.has(fileName)) {
        commons.log('[Debug]: An unknown template "' + fileName + '" was deleted, skipping.');
        return;
    }
    commons.templateCache.remove(fileName);
    commons.log('[Info]: Uncached "' + fileName + '"');
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileDeleteEvent(fileName) {
    var bindUrl = function(stmt) { stmt.bindString(0, fileName); };
    if (app.currentWebsite.db.delete('delete from staticFileResources where `url` = ?',
                          bindUrl) < 1) {
        commons.log('[Debug]: An unknown file "' + fileName + '" was deleted, skipping.');
        return;
    }
    // Wipe uploadStatus completely if the file isn't uploaded
    if (app.currentWebsite.db.delete('delete from uploadStatuses where \
                          `url` = ? and `uphash` is null', bindUrl) < 1) {
        // Otherwise mark it as removed
        app.currentWebsite.db.update('update uploadStatuses set `curhash` = null where \
                           `url` = ?', bindUrl);
    }
    commons.log('[Info]: Removed "' + fileName + '"');
}

/**
 * @param {string} from eg. 'layout.jsx.htm'
 * @param {string} to eg. 'renamed.jsx.htm'
 */
function handleTemplateRenameEvent(from, to) {
    var fn = commons.templateCache.get(from);
    if (!fn) {
        commons.log('[Debug]: Unattached template "' + from + '" was renamed, skipping.');
        return;
    }
    // Update the site graph
    var siteGraph = app.currentWebsite.graph;
    var p = siteGraph.pages;
    var numUserPages = 0;
    for (var url in p) {
        if (p[url].layoutFileName == from) {
            p[url].layoutFileName = to;
            numUserPages += 1;
        }
    }
    if (numUserPages > 0) {
        app.currentWebsite.saveToDb(siteGraph);
    }
    // Relocate the template function
    commons.templateCache.put(to, fn);
    commons.templateCache.remove(from);
    commons.log('[Info]: Renamed "' + from + '"');
}

/**
 * @param {string} from eg. 'file.js'
 * @param {string} to eg. 'renamed.js'
 */
function handleCssOrJsFileRenameEvent(from, to) {
    from = '/' + from;
    to = '/' + to;
    app.currentWebsite.db.insert('insert or replace into staticFileResources values\
        (?,coalesce((select `isOk` from staticFileResources where `url`=?),0))',
        function(stmt) {
            stmt.bindString(0, to);
            stmt.bindString(1, from);
        });
    app.currentWebsite.db.delete('delete from staticFileResources where `url` = ?',
        function(stmt) {
            stmt.bindString(0, from);
        });
    app.currentWebsite.db.update('update uploadStatuses set `url` = ? where `url` = ?',
        function(stmt) {
            stmt.bindString(0, to);
            stmt.bindString(1, from);
        });
    commons.log('[Info]: Renamed "' + from + '"');
}

/**
 * @param {string} joined EVENT_RENAME's half-ass value eg. file.js>/path/to/site/renamed.js
 * @returns {[string, string]} eg. ['file.ext', 'renamed.ext']
 */
function extractRenameFileNames(joined) {
    var pcs = joined.split('>');
    pcs[1] = pcs[1].substr(app.currentWebsite.dirPath.length);
    return pcs;
}