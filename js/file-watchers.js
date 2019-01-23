var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
var website = require('website.js');
var siteGraph = website.siteGraph;

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
    var diff = page.dryRun(processSiteGraph);
    if (!diff) {
        return;
    }
    if (diff.staticFiles.length) {
        saveStaticFileUrlsToDb(diff.staticFiles);
    }
    if (diff.newPages) {
        saveWebsiteToDb(siteGraph);
    }
    print('[Info]: Rescanned \'' + page.url + '\': ' +
          (diff.newPages ? 'added page(s), ' : 'no page changes, ') +
          (diff.staticFiles.length ? 'detected' : 'no') + ' file resources.');
}

/**
 * @throws {Error}
 */
function saveStaticFileUrlsToDb(urls) {
    commons.db.insert(
        'insert or replace into staticFileResources values ' +
        urls.map(function() { return '(?)'; }).join(','),
        function(stmt) {
            urls.forEach(function(url, i) { stmt.bindString(i, url); });
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

function processSiteGraph(domTree) {
    var out = {newPages: [], staticFiles: []};
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
            if (href) {
                if (href.charAt(0) != '/') href = '/' + href;
            } else {
                print('[Error]: Can\'t follow link without href.');
                return;
            }
            // Page already in the sitegraph -> skip
            if (siteGraph.getPage(href)) continue;
            // New page -> add it
            var newPage = siteGraph.addPage(href, 0, 0);
            var layout = siteGraph.findTemplate(layoutFileName);
            if (layout) {
                if (!layout.samplePage) layout.samplePage = newPage;
            } else {
                layout = siteGraph.addTemplate(layoutFileName, newPage);
            }
            newPage.layoutIdx = layout.idx;
            out.newPages.push(newPage);
        /*
         * Handle <script src=<path>...
         */
        } else if (el.tagName == 'script' && (scriptSrc = el.props.src)) {
            out.staticFiles.push(scriptSrc);
        /*
         * Handle <link href=<path>...
         */
        } else if (el.tagName == 'link' && (styleHref = el.props.href)) {
            out.staticFiles.push(styleHref);
        }
    }
    return out;
}