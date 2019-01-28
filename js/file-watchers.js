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
    } else if (type == fileWatcher.EVENT_REMOVE) {
        handleFileDeleteEvent(fileName);
    }
}

/**
 * @param {string} fileName
 */
function handleFileCreateEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        // Add the layout, and leave its .exists to false
        var samplePage = null;
        for (var key in siteGraph.pages)
            if (siteGraph.pages[key].layoutFileName == fileName) {
                samplePage = siteGraph.pages[key]; break;
            }
        siteGraph.addTemplate(fileName, samplePage);
        saveWebsiteToDb(siteGraph);
        print('[Info]: Added "' + fileName + '"');
    }
    // Skip compileAndCache()
}

/**
 * @param {string} fileName
 */
function handleFileModifyEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        print('[Notice]: An unknown template "' + fileName + '" was modified, skipping.');
        return;
    }
    if (website.website.compileAndCacheTemplate(fileName)) {
        print('[Info]: Cached "' + fileName + '"');
        layout.exists = true;
    }
    if (layout.samplePage) {
        performRescan(layout.samplePage);
    }
}

/**
 * @param {string} fileName
 */
function handleFileDeleteEvent(fileName) {
    var layout = siteGraph.getTemplate(fileName);
    if (!layout) {
        print('[Notice]: An unknown template "' + fileName + '" was deleted, skipping.');
        return;
    }
    website.website.deleteAndUncacheTemplate(layout.fileName);
    saveWebsiteToDb(siteGraph);
    print('[Info]: Removed "' + fileName + '"');
}

function Diff() {
    this.nPagesAdded = 0;   // The number of completely new pages
    this.nPagesRemoved = 0; // The number of completely removed pages (refCount==0)
    this.nLinksAdded = 0;   // The number of new links added to the root page
    this.nLinksRemoved = 0; // The number of links removed from the root page
    this.staticFiles = {};  // A list of script/css urls
    this.nLinksFollowed = 0;
}
/**
 * Scans $page for new/removed links+static urls updating website.siteGraph
 * along the way.
 */
Diff.prototype.scanChanges = function(page) {
    if (this.nLinksFollowed > MAX_LINK_FOLLOW_COUNT) {
        return false;
    }
    var stillLinksTo = null;
    var nOldLinksFound = 0;
    var nOldLinks = 0;
    if (this.nLinksFollowed == 0) {
        stillLinksTo = {};
        for (var url in page.linksTo) { stillLinksTo[url] = false; nOldLinks += 1; }
    }
    var els = page.dryRun().getRenderedElements();
    var l = els.length;
    for (var i = 0; i < l; ++i) {
        var el = els[i];
        var layoutFileName = null;
        /*
         * Handle <a href=<url>...
         */
        if (el.tagName == 'a' && (layoutFileName = el.props.layoutFileName)) {
            var href = el.props.href;
            var scriptSrc = null;
            var styleHref = null;
            if (typeof href != 'string') {
                print('[Error]: Can\'t follow link without href.');
                return;
            }
            if (href == '') continue;
            if (href == '/') href = website.siteConfig.homeUrl;
            // Page already in the sitegraph
            if (siteGraph.getPage(href)) {
                if (stillLinksTo) { stillLinksTo[href] = true; nOldLinksFound += 1; }
                if (!page.linksTo[href]) this.addNewLink(href, page);
                continue;
            }
            // Totally new page -> add it
            var newPage = siteGraph.addPage(href, 0, layoutFileName);
            this.addNewLink(href, page, true);
            var layout = siteGraph.getTemplate(layoutFileName);
            if (layout) {
                if (!layout.samplePage) layout.samplePage = newPage;
            } else {
                layout = siteGraph.addTemplate(layoutFileName, newPage);
            }
            // Follow it if it has a valid layout
            if (layout.exists) {
                this.nLinksFollowed += 1;
                if (!this.scanChanges(newPage)) return false;
            }
        /*
         * Handle <script src=<path>...
         */
        } else if (el.tagName == 'script' && (scriptSrc = el.props.src)) {
            this.staticFiles[scriptSrc] = 1;
        /*
         * Handle <link href=<path>...
         */
        } else if (el.tagName == 'link' && (styleHref = el.props.href)) {
            this.staticFiles[styleHref] = 1;
        }
    }
    //
    if (stillLinksTo && nOldLinksFound < nOldLinks) { // At least one link was removed
        page.linksTo = {}; // Build from scratch
        for (url in stillLinksTo) {
            if (stillLinksTo[url]) page.linksTo[url] = 1; // Still there -> add
            else this.removeLink(url, page); // Was removed -> don't add to linksTo
        }
    }
    return true;
};
Diff.prototype.addNewLink = function(url, toPage, isNewPage) {
    this.nLinksAdded += 1;
    if (isNewPage) {
        this.nPagesAdded += 1;
    }
    toPage.linksTo[url] = 1;
    if (toPage.url != url) {
        siteGraph.pages[url].refCount += 1;
    }
};
Diff.prototype.removeLink = function(url, fromPage) {
    this.nLinksRemoved += 1;
    if (url != fromPage.url && --siteGraph.pages[url].refCount < 1 && // Was the last reference
        url !== website.siteConfig.homeUrl) { // ... and wasn't the home page
        delete siteGraph.pages[url];
        this.nPagesRemoved += 1;
    }
};

/**
 * @param {Page} page
 */
function performRescan(page) {
    var diff = new Diff();
    if (!diff.scanChanges(page)) {
        print('[Error]: Stopped scanning at ' + diff.nLinksFollowed + 'th. link');
    }
    for (var hadStaticFiles in diff.staticFiles) {
        saveStaticFileUrlsToDb(diff.staticFiles);
        break;
    }
    if (diff.nLinksAdded || diff.nLinksRemoved) {
        saveWebsiteToDb(siteGraph);
    }
    print('[Info]: Rescanned \'' + page.url + '\': ' +
          (diff.nPagesAdded ? 'added page(s), ' : '') +
          (diff.nPagesRemoved ? 'removed page(s), ' : '') +
          (!diff.nPagesAdded && !diff.nPagesRemoved ? 'no page changes, ' : '') +
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