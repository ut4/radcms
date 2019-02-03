var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;
var website = require('website.js');
var siteGraph = website.siteGraph;
var directives = require('directives.js');

exports.init = function() {
    fileWatcher.setWatchFn(handleFWEvent);
    commons.signals.listen('sitegraphRescanRequested', performRescan);
    exports.init = function() {};
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
        siteGraph.addTemplate(fileName);
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
    performRescan('full');
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
    this.removedLinkUrls = {};
    this.staticFiles = {};  // A list of script/css urls
}

/**
 * Scans $pages for new/removed links+static urls updating website.siteGraph
 * along the way.
 *
 * @param {Page[]} pages
 */
Diff.prototype.scanChanges = function(pages) {
    var completelyNewPages = {};
    for (var url in pages) {
        var page = pages[url];
        if (page.refCount < 1) continue;
        var newLinksTo = {};
        var domTree = page.dryRun();
        var fnCmps = domTree.getRenderedFnComponents();
        var l = fnCmps.length;
        for (var i = 0; i < l; ++i) {
            var props = fnCmps[i].props;
            if (fnCmps[i].fn !== directives.Link) continue;
            var href = props.to;
            newLinksTo[href] = 1;
            // Page already in the sitegraph
            if (siteGraph.getPage(href)) {
                if (!page.linksTo[href]) this.addLink(href, page);
            // Totally new page -> add it
            } else {
                completelyNewPages[href] = siteGraph.addPage(href,
                    href.indexOf(url) === 0 ? url : '',
                    props.layoutOverride || website.siteConfig.defaultLayout);
                this.addLink(href, page, true);
            }
            if (props.layoutOverride) {
                var layout = siteGraph.getTemplate(props.layoutOverride);
                if (!layout) {
                    layout = siteGraph.addTemplate(props.layoutOverride);
                }
            }
        }
        //
        for (url in page.linksTo) {
            if (!newLinksTo[url]) this.removeLink(url, page);
        }
        page.linksTo = newLinksTo;
        //
        var els = domTree.getRenderedElements();
        var scriptSrc = null;
        var styleHref = null;
        l = els.length;
        for (i = 0; i < l; ++i) {
            var el = els[i];
            if (el.tagName == 'script' && (scriptSrc = el.props.src)) {
                this.staticFiles[scriptSrc] = 1;
            } else if (el.tagName == 'link' && (styleHref = el.props.href)) {
                this.staticFiles[styleHref] = 1;
            }
        }
    }
    for (url in completelyNewPages) {
        this.scanChanges(completelyNewPages);
        break;
    }
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
    if (fromPage.linksTo[url] === 0) return; // Already removed from this page
    this.nLinksRemoved += 1;
    if (url != fromPage.url) {
        fromPage.linksTo[url] = 0;
        this.removedLinkUrls[url] = 1;
        var p = siteGraph.pages[url];
        p.refCount -= 1;
        // Was child-page or doesn't link to anywhere anymore -> recurse
        if (p.parentUrl == fromPage.url || p.refCount == 0) {
            for (var url2 in p.linksTo) {
                if (p.linksTo[url2] === 1)
                    this.removeLink(url2, p);
            }
        }
    }
};
Diff.prototype.deleteUnreachablePages = function() {
    var homeUrl = website.siteConfig.homeUrl;
    for (var url in this.removedLinkUrls) {
        var r = siteGraph.pages[url].refCount;
        if (r < 1 && url != homeUrl) {
            delete siteGraph.pages[url];
            this.nPagesRemoved += 1;
        }
    }
};

/**
 * @param {string} type 'full'
 */
function performRescan(type) {
    if (type !== 'full') throw new TypeError('Not implemented.');
    var diff = new Diff();
    diff.scanChanges(siteGraph.pages);
    diff.deleteUnreachablePages();
    for (var hadStaticFiles in diff.staticFiles) {
        saveStaticFileUrlsToDb(diff.staticFiles);
        break;
    }
    if (diff.nLinksAdded || diff.nLinksRemoved) {
        saveWebsiteToDb(siteGraph);
    }
    print('[Info]: Rescanned the site: ' +
          (diff.nPagesAdded ? 'added ' + diff.nPagesAdded + ' page(s), ' : '') +
          (diff.nPagesRemoved ? 'removed ' + diff.nPagesRemoved + ' page(s), ' : '') +
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