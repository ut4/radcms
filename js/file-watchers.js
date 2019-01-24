var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
var website = require('website.js');
var siteGraph = website.siteGraph;
var MAX_LINK_FOLLOW_COUNT = 65535;

exports.init = function() {
    fileWatcher.setWatchFn(handleFWEvent);
    commons.signals.listen('sitegraphRescanRequested', performRescan);
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
    }
}

/**
 * @param {string} fileName
 */
function handleFileCreateEvent(fileName) {
    var layout = siteGraph.findTemplate(fileName);
    if (!layout) {
        // Add the layout, and leave its .exists to false
        siteGraph.addTemplate(fileName, null);
        saveWebsiteToDb(siteGraph);
    }
    // Skip compileAndCache()
}

/**
 * @param {string} fileName
 */
function handleFileModifyEvent(fileName) {
    var layout = siteGraph.findTemplate(fileName);
    if (!layout) {
        print('[Notice]: An unknown file "' + fileName + '" was modified, skipping.');
        return;
    }
    if (website.website.compileAndCacheTemplate(layout)) {
        print('[Info]: Cached ' + fileName);
        layout.exists = true;
    }
    if (layout.samplePage) {
        performRescan(layout.samplePage);
    }
}

/**
 * @param {Page} page
 */
function performRescan(page) {
    var diff = {nLinksFollowed: 0, newPages: {}, staticFiles: {}};
    var domTree = page.dryRun();
    if (!scanChanges(domTree, page.url, diff)) {
        console.log('[Error]: Stopped scanning at ' + diff.nLinksFollowed +
                    'th. link');
    }
    for (var hadStaticFiles in diff.staticFiles) {
        saveStaticFileUrlsToDb(diff.staticFiles);
        break;
    }
    for (var hadNewPages in diff.newPages) {
        saveWebsiteToDb(siteGraph);
        break;
    }
    print('[Info]: Rescanned \'' + page.url + '\': ' +
          (hadNewPages ? 'added page(s), ' : 'no page changes, ') +
          (hadStaticFiles ? 'detected' : 'no') + ' file resources.');
}

/**
 * @throws {Error}
 */
function saveStaticFileUrlsToDb(urls) {
    var holders = [];
    for (var hadUrls in urls) {
        holders.push('(?)');
    }
    if (!hadUrls) {
        return;
    }
    commons.db.insert(
        'insert or replace into staticFileResources values ' + holders.join(','),
        function(stmt) {
            var i = 0;
            for (var url in urls) { stmt.bindString(i, url); i += 1; }
        }
    );
}

/**
 * @throws {Error}
 */
function saveWebsiteToDb(siteGraph) {
    commons.db.update('update websites set `graph` = ?', function(stmt) {
        stmt.bindString(0, siteGraph.serialize());
    });
}

function scanChanges(domTree, url, diff) {
    if (diff.nLinksFollowed > MAX_LINK_FOLLOW_COUNT) {
        return false;
    }
    var els = domTree.getRenderedElements();
    var l = els.length;
    for (var i = 0; i < l; ++i) {
        var el = els[i];
        var layoutFileName = null;
        /*
         * Handle <a href=<path>...
         */
        if (el.tagName == 'a' && (layoutFileName = el.props.layoutFileName)) {
            var href = el.props.href;
            var scriptSrc = null;
            var styleHref = null;
            if (typeof href != 'string') {
                print('[Error]: Can\'t follow link without href.');
                return;
            }
            // Page already in the sitegraph -> skip
            if (href == '' || href == '/' || siteGraph.getPage(href)) continue;
            // New page -> add it
            var newPage = siteGraph.addPage(href, 0, 0);
            var layout = siteGraph.findTemplate(layoutFileName);
            if (layout) {
                if (!layout.samplePage) layout.samplePage = newPage;
            } else {
                layout = siteGraph.addTemplate(layoutFileName, newPage);
            }
            newPage.layoutIdx = layout.idx;
            diff.newPages[newPage.url] = newPage;
            // Follow it
            if (layout.exists) {
                var domTree2 = newPage.dryRun();
                diff.nLinksFollowed += 1;
                if (!scanChanges(domTree2, newPage.url, diff)) return false;
            }
        /*
         * Handle <script src=<path>...
         */
        } else if (el.tagName == 'script' && (scriptSrc = el.props.src)) {
            diff.staticFiles[scriptSrc] = 1;
        /*
         * Handle <link href=<path>...
         */
        } else if (el.tagName == 'link' && (styleHref = el.props.href)) {
            diff.staticFiles[styleHref] = 1;
        }
    }
    return true;
}