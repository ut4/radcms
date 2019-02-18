var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
var website = require('website.js');
var siteGraph = website.siteGraph;
var diff = require('website-diff.js');

exports.init = function() {
    fileWatcher.setWatchFn(handleFWEvent);
    commons.signals.listen('siteGraphRescanRequested', diff.performRescan);
};

/**
 * Receives all file events.
 *
 * @param {number} type commons.fileWatcher.EVENT_*.
 * @param {string} fileName
 */
function handleFWEvent(type, fileName) {
    if (type == fileWatcher.EVENT_CREATE) {
        handleFileCreateEvent(fileName);
    } else if (type == fileWatcher.EVENT_WRITE) {
        handleFileModifyEvent(fileName);
    } else if (type == fileWatcher.EVENT_REMOVE) {
        handleFileDeleteEvent(fileName);
    }
}

/**
 * @param {string} fileName
 */
function handleFileCreateEvent(fileName) {
    if (!siteGraph.getTemplate(fileName)) {
        // Add the layout, and leave its .isOk to false
        siteGraph.addTemplate(fileName);
        website.saveToDb(siteGraph);
        commons.log('[Info]: ' + 'Added "' + fileName + '"');
    }
    // Skip compileAndCache()
}

/**
 * @param {string} fileName
 */
function handleFileModifyEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        commons.log('[Notice]: An unknown template "' + fileName + '" was modified, skipping.');
        return;
    }
    if (website.website.compileAndCacheTemplate(fileName)) {
        commons.log('[Info]: Cached "' + fileName + '"');
        layout.isOk = true;
    }
    diff.performRescan('usersOf:' + fileName);
}

/**
 * @param {string} fileName
 */
function handleFileDeleteEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        commons.log('[Notice]: An unknown template "' + fileName + '" was deleted, skipping.');
        return;
    }
    website.website.deleteAndUncacheTemplate(layout.fileName);
    website.saveToDb(siteGraph);
    commons.log('[Info]: Removed "' + fileName + '"');
}