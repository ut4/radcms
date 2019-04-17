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
const CONFIG_EXT = 'ini';

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
    const assetFileExts = app.currentWebsite.config.assetFileExts;
    if (type == fileWatcher.EVENT_ADD) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateCreateEvent(fileName);
        else if (assetFileExts.indexOf(fileExt) > -1)
            handleAssetFileCreateEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_CHANGE) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateModifyEvent(fileName);
        else if (assetFileExts.indexOf(fileExt) > -1)
            handleAssetFileModifyEvent('/' + fileName);
        else if (fileExt == CONFIG_EXT)
            handleConfigFileModifyEvent(fileName);
    } else if (type == fileWatcher.EVENT_UNLINK) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateDeleteEvent(fileName);
        else if (assetFileExts.indexOf(fileExt) > -1)
            handleAssetFileDeleteEvent('/' + fileName);
    } else if (type == fileWatcher.EVENT_RENAME) {
        if (fileExt == TEMPLATE_EXT)
            handleTemplateRenameEvent.apply(null, fileName.split('>'));
        else if (assetFileExts.indexOf(fileExt) > -1)
            handleAssetFileRenameEvent.apply(null, fileName.split('>'));
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
function handleAssetFileCreateEvent(fileName) {
    const w = app.currentWebsite.db;
    w.prepare('insert or replace into assetFiles values (?)').run(fileName);
    insertOrUpdateCurChecksumIfInUse(fileName);
    app.log('[Info]: ' + 'Registered "' + fileName + '"');
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateModifyEvent(fileName) {
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
function handleAssetFileModifyEvent(fileName) {
    insertOrUpdateCurChecksumIfInUse(fileName);
    app.log('[Info]: Updated "' + fileName + '"');
}

/**
 * @param {string} fileUrl eg. '/file.css'
 */
function insertOrUpdateCurChecksumIfInUse(fileUrl) {
    const db = app.currentWebsite.db;
    // Check if $fileUrl has references somewhere
    if (db.prepare('select `fileUrl` from assetFileRefs where `fileUrl` = ? limit 1')
          .raw().get(fileUrl)) {
        // It has -> update the local checksum (curhash)
        db.prepare('insert or replace into uploadStatuses values \
            (?,?,(select `uphash` from uploadStatuses where `url`=?),1)').run(
            fileUrl,
            diff.sha1(app.currentWebsite.readOwnFile(fileUrl)),
            fileUrl
        );
    }
}

/**
 * @param {string} fileName eg. 'site.ini'
 */
function handleConfigFileModifyEvent(fileName) {
    if (fileName != 'site.ini') {
        app.log('[Debug]: An unknown config file "' + fileName + '" was modified, skipping.');
        return;
    }
    const w = app.currentWebsite;
    w.config.loadFromDisk(w.dirPath);
    app.log('[Info]: updated site.ini');
}

/**
 * @param {string} fileName eg. 'layout.jsx.htm'
 */
function handleTemplateDeleteEvent(fileName) {
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
function handleAssetFileDeleteEvent(fileName) {
    if (app.currentWebsite.db
            .prepare('delete from assetFiles where `url` = ?')
            .run(fileName).changes < 1) {
        app.log('[Debug]: An unknown file "' + fileName + '" was deleted, skipping.');
        return;
    }
    // Wipe uploadStatus completely if the file isn't uploaded
    if (app.currentWebsite.db
            .prepare('delete from uploadStatuses where `url` = ? and `uphash` is null')
            .run(fileName).changes < 1) {
        // Otherwise mark as removed
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
    app.log('[Info]: Renamed "' + from + '" > "' + to + '"');
}

/**
 * @param {string} from eg. 'file.js'
 * @param {string} to eg. 'renamed.js'
 */
function handleAssetFileRenameEvent(from, to) {
    from = '/' + from;
    to = '/' + to;
    app.currentWebsite.db
        .prepare('update assetFiles set `url` = ? where `url` = ?')
        .run(to, from);
    // todo
    //
    app.log('[Info]: Renamed "' + from + '" > "' + to + '"');
}

exports.handleFWEvent = handleFWEvent;
