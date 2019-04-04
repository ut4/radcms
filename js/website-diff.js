/**
 * == website-diff.js ====
 *
 * This file contains logic for the automatic page scanning, and the tracking of
 * remote <-> local content.
 */
var app = require('app.js').app;
var commons = require('common-services.js');

/**
 * @param {string} type 'full' or 'usersOf:some-template.jsx.htm'
 */
exports.performRescan = function(type) {
    var usersOf = '';
    if (type != 'full') {
        usersOf = type.split(':')[1];
        if (!commons.templateCache.has(usersOf)) return;
    }
    var diff = new LocalDiff();
    var siteGraph = app.currentWebsite.graph;
    diff.scanChanges(siteGraph.pages, usersOf);
    diff.deleteUnreachablePages();
    diff.remoteDiff.saveStatusesToDb();
    if (diff.nLinksAdded || diff.nLinksRemoved) {
        app.currentWebsite.saveToDb(siteGraph);
    }
    var m = [];
    if (diff.nPagesAdded) m.push('added ' + diff.nPagesAdded + ' page(s)');
    if (diff.nPagesRemoved) m.push('removed ' + diff.nPagesRemoved + ' page(s)');
    if (diff.nLinksAdded) m.push('added ' + diff.nLinksAdded + ' link(s)');
    if (diff.nLinksRemoved) m.push('removed ' + diff.nLinksRemoved + ' link(s)');
    if (diff.remoteDiff.nNewFiles) m.push('discovered ' + diff.remoteDiff.nNewFiles +
        ' file resources');
    commons.log('[Info]: Rescanned the site' + (m.length ? ': ' + m.join(', ') : ''));
};


// == LocalDiff ====
// =============================================================================
function LocalDiff() {
    this.nPagesAdded = 0;   // The number of completely new pages
    this.nPagesRemoved = 0; // The number of completely removed pages (refCount==0)
    this.nLinksAdded = 0;   // The number of new links added
    this.nLinksRemoved = 0; // The number of links removed
    this.removedLinkUrls = {};
    this.staticFiles = {};  // A list of script/css urls
    this.remoteDiff = new exports.RemoteDiff(); // use exports so it can be mocked
}

/**
 * Scans $pages for new/removed links+static urls updating website.graph
 * along the way.
 *
 * @param {Page[]} pages
 * @param {string?} usersOfLayout '' == scan all pages, 'foo.jsx.htm' == scan only pages rendered by 'foo.jsx.htm'
 */
LocalDiff.prototype.scanChanges = function(pages, usersOfLayout) {
    var completelyNewPages = {};
    var RadLink = commons.templateCache.get('RadLink');
    var website = app.currentWebsite;
    for (var url in pages) {
        var page = pages[url];
        if (page.refCount < 1 || (usersOfLayout && page.layoutFileName != usersOfLayout)) continue;
        var newLinksTo = {};
        var domTree = new commons.DomTree();
        this.remoteDiff.addPageToCheck(page.url, website.renderPage2(page, domTree));
        var fnCmps = domTree.getRenderedFnComponents();
        var l = fnCmps.length;
        for (var i = 0; i < l; ++i) {
            var props = fnCmps[i].props;
            if (fnCmps[i].fn !== RadLink) continue;
            var href = props.to;
            newLinksTo[href] = 1;
            // Page already in the site graph
            if (website.graph.getPage(href)) {
                if (!page.linksTo[href]) this.addLink(href, page);
            // Totally new page -> add it
            } else {
                completelyNewPages[href] = website.graph.addPage(href,
                    href.indexOf(url) === 0 ? url : '',
                    props.layoutOverride || website.config.defaultLayout);
                this.addLink(href, page, true);
            }
        }
        //
        for (url in page.linksTo) {
            if (!newLinksTo[url]) this.removeLink(url, page);
        }
        page.linksTo = newLinksTo;
        //
        var els = domTree.getRenderedElements();
        var fileUrl = null;
        var hasBase = false;
        l = els.length;
        for (i = 0; i < l; ++i) {
            var el = els[i];
            if (((
                    el.tagName == 'script' &&
                    (fileUrl = el.props.src)
                ) || (
                    el.tagName == 'link' &&
                    (fileUrl = el.props.href) &&
                    el.props.rel == 'stylesheet'
                )) &&
                fileUrl.indexOf('//') == -1 // reject 'http(s)://foo.js' and '//foo.js'
            ) {
                if (fileUrl.charAt(0) != '/' && !hasBase) {
                    fileUrl = '/' + fileUrl;
                    commons.log('[Warn]: The urls of local script/styles should start with \'/\'.');
                }
                this.staticFiles[fileUrl] = 1;
                this.remoteDiff.addFileToCheck(fileUrl);
            } else if (!hasBase && el.tagName == 'base' && (fileUrl = el.href)) {
                hasBase = fileUrl.charAt(fileUrl.length - 1) == '/';
            }
        }
    }
    for (url in completelyNewPages) {
        this.scanChanges(completelyNewPages);
        break;
    }
};

/**
 * @param {string} url
 * @param {Page} toPage
 * @param {bool} isNewPage
 */
LocalDiff.prototype.addLink = function(url, toPage, isNewPage) {
    this.nLinksAdded += 1;
    if (isNewPage) {
        this.nPagesAdded += 1;
    }
    toPage.linksTo[url] = 1;
    if (toPage.url != url) {
        app.currentWebsite.graph.pages[url].refCount += 1;
    }
};

/**
 * @param {string} url
 * @param {Page} fromPage
 */
LocalDiff.prototype.removeLink = function(url, fromPage) {
    if (fromPage.linksTo[url] === 0) return; // Already removed from this page
    this.nLinksRemoved += 1;
    if (url != fromPage.url) {
        fromPage.linksTo[url] = 0;
        this.removedLinkUrls[url] = 1;
        var p = app.currentWebsite.graph.pages[url];
        // Doesn't link to anywhere anymore -> recurse
        if (--p.refCount == 0) {
            for (var url2 in p.linksTo) {
                if (p.linksTo[url2] === 1 && url2 != p.url) {
                    this.removeLink(url2, p);
                }
            }
        }
    }
};

LocalDiff.prototype.deleteUnreachablePages = function() {
    var homeUrl = app.currentWebsite.config.homeUrl;
    var siteGraph = app.currentWebsite.graph;
    for (var url in this.removedLinkUrls) {
        var r = siteGraph.pages[url].refCount;
        if (r < 1 && url != homeUrl) {
            delete siteGraph.pages[url];
            this.remoteDiff.addPageToDelete(url);
            this.nPagesRemoved += 1;
        }
    }
};

exports.RemoteDiff = RemoteDiff;