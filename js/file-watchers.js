var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
var website = require('website.js');
var siteGraph = website.siteGraph;
var directives = require('directives.js');
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
    this.nLinkSpawnersAdded = 0; // The number of new <ArticleLists/>'s etc.
    this.staticFiles = {};  // A list of script/css urls
    this.followedUrls = {};
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
    var stillLinksTo = {};
    var nOldLinksFound = 0;
    var nOldLinks = 0;
    for (var url in page.linksTo) { stillLinksTo[url] = false; nOldLinks += 1;}
    var domTree = page.dryRun();
    var fnCmps = domTree.getRenderedFnComponents();
    var l = fnCmps.length;
    for (var i = 0; i < l; ++i) {
        var props = fnCmps[i].props;
        if (fnCmps[i].fn === directives.ArticleList &&
            !siteGraph.getLinkSpawner(props.name)) {
            siteGraph.addLinkSpawner(props.name, page.url);
            this.nLinkSpawnersAdded += 1;
        }
        if (fnCmps[i].fn !== directives.Link) continue;
        var href = props.to;
        var hrefPage = null;
        // Page already in the sitegraph
        if ((hrefPage = siteGraph.getPage(href))) {
            stillLinksTo[href] = true; nOldLinksFound += 1;
            if (!page.linksTo[href]) this.addLink(href, page);
        // Totally new page -> add it
        } else {
            hrefPage = siteGraph.addPage(href, 0,
                props.layoutOverride || website.siteConfig.defaultLayout);
            this.addLink(href, page, true);
        }
        if (props.layoutOverride) {
            var layout = siteGraph.getTemplate(props.layoutOverride);
            if (layout) {
                if (!layout.samplePage) layout.samplePage = hrefPage;
            } else {
                layout = siteGraph.addTemplate(props.layoutOverride, hrefPage);
            }
        }
        if (props.follow && !this.followedUrls[href]) {
            this.nLinksFollowed += 1;
            this.followedUrls[href] = 1;
            if (!this.scanChanges(hrefPage)) return false;
        }
    }
    //
    if (nOldLinksFound < nOldLinks) { // At least one link was removed
        page.linksTo = {}; // Rebuild from scratch
        for (url in stillLinksTo) {
            if (stillLinksTo[url]) page.linksTo[url] = 1; // Still there -> add
            else this.removeLink(url, page); // Was removed -> don't add to linksTo
        }
    }
    var els = domTree.getRenderedElements();
    var scriptSrc = null;
    var styleHref = null;
    l = els.length;
    for (i = 0; i < l; ++i) {
        var el = els[i];
        /*
         * Handle <script src=<path>...
         */
        if (el.tagName == 'script' && (scriptSrc = el.props.src)) {
            this.staticFiles[scriptSrc] = 1;
        /*
         * Handle <link href=<path>...
         */
        } else if (el.tagName == 'link' && (styleHref = el.props.href)) {
            this.staticFiles[styleHref] = 1;
        }
    }
    return true;
};
Diff.prototype.addLink = function(url, toPage, isNewPage) {
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
    if (diff.nLinksAdded || diff.nLinksRemoved || diff.nLinkSpawnersAdded) {
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