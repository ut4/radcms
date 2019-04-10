/**
 * # file-watchers.js
 *
 * This file contains handlers for the fswatch events.
 *
 */
const {app} = require('./app.js');
const {signals, fileWatcher} = require('./common-services.js');
const {templateCache} = require('./templating.js');
const diff = require('./website-diff.js');

const TEMPLATE_EXT = 'htm';

exports.init = () => {
    fileWatcher.setWatchFn(handleFWEvent);
    signals.listen('siteGraphRescanRequested', diff.performRescan);
};

/**
 * Receives all file events.
 *
 * @param {string} type commons.fileWatcher.EVENT_*.
 * @param {string} fileName eg. 'file.css'
 */
function handleFWEvent(type, fileName) {
    const fileExt = fileName.substr(fileName.lastIndexOf('.') + 1);
    if (type == fileWatcher.EVENT_ADD) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateCreateEvent(fileName);
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileCreateEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_CHANGE) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateModifyEventEvent(fileName);
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileModifyEventEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_UNLINK) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateDeleteEventEvent(fileName);
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileDeleteEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_RENAME) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateRenameEvent.apply(null, fileName.split('>'));
        else if (fileExt == 'css' || fileExt == 'js')
            handleCssOrJsFileRenameEvent.apply(null, fileName.split('>'));
        else return;
    }
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateCreateEvent(fileName) {
    app.log('[Info]: ' + 'Noted "' + fileName + '"');
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileCreateEvent(fileName) {
    // Register the file, and set its `isOk` to 0
    app.currentWebsite.db
        .prepare('insert or replace into staticFileResources values (?, 0)')
        .run(fileName);
    app.log('[Info]: ' + 'Registered "' + fileName + '"');
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateModifyEventEvent(fileName) {
    try {
        if (app.currentWebsite.compileAndCacheTemplate(fileName)) {
            app.log('[Info]: Cached "' + fileName + '"');
        }
    } catch (e) {
        app.logException(e);
        return;
    }
    diff.performRescan('full');
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileModifyEventEvent(fileName) {
    // Check if this file is registered (and update it's isOk)
    const numAffected = app.currentWebsite.db
        .prepare('update staticFileResources set `isOk` = 1 where `url` = ?')
        .run(fileName).changes;
    // It is -> insert or update the new checksum
    if (numAffected > 0) {
        app.currentWebsite.db.prepare('insert or replace into uploadStatuses values \
            (?,?,(select `uphash` from uploadStatuses where `url`=?),1)').run(
                fileName,
                diff.sha1(app.currentWebsite.readOwnFile(fileName)),
                fileName
            );
        app.log('[Info]: Updated "' + fileName + '"');
    } else {
        app.log('[Debug]: An unknown file "' + fileName + '" was modified, skipping.');
    }
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateDeleteEventEvent(fileName) {
    if (!templateCache.has(fileName)) {
        app.log('[Debug]: An unknown template "' + fileName + '" was deleted, skipping.');
        return;
    }
    templateCache.remove(fileName);
    app.log('[Info]: Uncached "' + fileName + '"');
}

/**
 * @param {string} fileName eg. '/file.css'
 */
function handleCssOrJsFileDeleteEvent(fileName) {
    if (app.currentWebsite.db
            .prepare('delete from staticFileResources where `url` = ?')
            .run(fileName).changes < 1) {
        app.log('[Debug]: An unknown file "' + fileName + '" was deleted, skipping.');
        return;
    }
    // Wipe uploadStatus completely if the file isn't uploaded
    if (app.currentWebsite.db
            .prepare('delete from uploadStatuses where `url` = ? and `uphash` is null')
            .run(fileName).changes < 1) {
        // Otherwise mark it as removed
        app.currentWebsite.db
            .prepare('update uploadStatuses set `curhash` = null where `url` = ?')
            .run(fileName);
    }
    app.log('[Info]: Removed "' + fileName + '"');
}

/**
 * @param {string} from eg. 'layout.jsx.htm'
 * @param {string} to eg. 'renamed.jsx.htm'
 */
function handleTemplateRenameEvent(from, to) {
    const fn = templateCache.get(from);
    if (!fn) {
        app.log('[Debug]: Unattached template "' + from + '" was renamed, skipping.');
        return;
    }
    // Update the site graph
    const siteGraph = app.currentWebsite.graph;
    const p = siteGraph.pages;
    let numUserPages = 0;
    for (const url in p) {
        if (p[url].layoutFileName == from) {
            p[url].layoutFileName = to;
            numUserPages += 1;
        }
    }
    if (numUserPages > 0) {
        app.currentWebsite.saveToDb(siteGraph);
    }
    // Relocate the template function
    templateCache.put(to, fn);
    templateCache.remove(from);
    app.log('[Info]: Renamed "' + from + '"');
}

/**
 * @param {string} from eg. 'file.js'
 * @param {string} to eg. 'renamed.js'
 */
function handleCssOrJsFileRenameEvent(from, to) {
    from = '/' + from;
    to = '/' + to;
    app.currentWebsite.db
        .prepare('insert or replace into staticFileResources values\
            (?,coalesce((select `isOk` from staticFileResources where `url`=?),0))')
        .run(to, from);
    app.currentWebsite.db
        .prepare('delete from staticFileResources where `url` = ?')
        .run(from);
    app.currentWebsite.db
        .prepare('update uploadStatuses set `url` = ? where `url` = ?')
        .run(to, from);
    app.log('[Info]: Renamed "' + from + '"');
}

exports.handleFWEvent = handleFWEvent;
