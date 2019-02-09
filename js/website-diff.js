var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var directives = require('directives.js');

/**
 * @param {string} type 'full' or 'usersOf:some-template.jsx.htm'
 */
exports.performRescan = function(type) {
    var usersOf = '', t;
    if (type != 'full') {
        usersOf = type.split(':')[1];
        if (!(t = siteGraph.getTemplate(usersOf)) || !t.isOk) return;
    }
    var diff = new LocalDiff();
    diff.scanChanges(siteGraph.pages, usersOf);
    diff.deleteUnreachablePages();
    diff.remoteDiff.saveStatusesToDb();
    if (siteGraph.hasUnsavedChanges || diff.nLinksAdded || diff.nLinksRemoved) {
        website.saveToDb(siteGraph);
        siteGraph.hasUnsavedChanges = false;
    }
    var m = [];
    if (diff.nPagesAdded) m.push('added ' + diff.nPagesAdded + ' page(s)');
    if (diff.nPagesRemoved) m.push('removed ' + diff.nPagesRemoved + ' page(s)');
    if (diff.nLinksAdded) m.push('added ' + diff.nLinksAdded + ' link(s)');
    if (diff.nLinksRemoved) m.push('removed ' + diff.nLinksRemoved + ' link(s)');
    if (diff.remoteDiff.nFilesAdded) m.push('discovered ' + diff.remoteDiff.nFilesAdded +
        ' file resources');
    commons.log('[Info]: Rescanned the site' + (m.length ? ': ' + m.join(', ') : ''));
};


// == RemoteDiff ====
// =============================================================================
function RemoteDiff() {
    /** @prop {[string]: {url: string; hash: string; uploadStatus: number; isFile: bool;}} */
    this.checkables = {};
    this.nFilesAdded = 0;
}

/**
 * @param {Page} page
 */
RemoteDiff.prototype.addPageToCheck = function(page) {
    if (!this.checkables.hasOwnProperty(page.url)) {
        this.checkables[page.url] = {url: page.url, hash: website.website.crypto.sha1(
            page.render()), uploadStatus: null, isFile: 0};
    }
};

/**
 * @param {string} url Always starts with '/' i.e. '/foo.css', '/bar.js'
 */
RemoteDiff.prototype.addFileToCheck = function(url) {
    this.checkables[url] = {url: url, hash: null, uploadStatus: null, isFile: 1};
};

/**
 * Checks each $this.checkable, determines its upload status (NOT_UPLOADED,
 * OUTDATED etc.) and saves it to the database if changed.
 *
 * @returns {boolean} Had/didn't have changes
 */
RemoteDiff.prototype.saveStatusesToDb = function() {
    var checkables = this.checkables;
    var selectHolders = [];
    for (var hadItems in checkables) selectHolders.push('?');
    if (!hadItems) return false;
    // Select current statuses from the database
    var oldHashes = {};
    commons.db.select('select * from uploadStatuses where `url` in (' +
        selectHolders.join(',') + ')', function(row) {
            oldHashes[row.getString(0)] = {hash: row.getString(1),
                uploadStatus: row.getInt(2), isFile: row.getInt(3)};
        }, function(stmt) {
            var i = 0; for (var url in checkables) {
                stmt.bindString(i++, url);
            }
        });
    // Collect files that were discovered, and pages which contents were changed
    var newStatuses = {data: [], holders: []};
    for (var url in checkables) {
        var c = checkables[url];
        var oldHash = oldHashes[c.url];
        if (!c.isFile) {
            // Page already saved, collect only if differs
            if (oldHash) {
                if (oldHash.hash == c.hash) continue;
                c.uploadStatus = oldHash.uploadStatus;
                if (c.uploadStatus != website.NOT_UPLOADED) c.uploadStatus = website.OUTDATED;
            // Not yet saved to the db
            } else {
                c.uploadStatus = website.NOT_UPLOADED;
            }
        } else if (!oldHash) { // File, not yet saved to the db
            c.hash = website.website.crypto.sha1(
                website.website.fs.read(insnEnv.sitePath + c.url.substr(1)));
            c.uploadStatus = website.NOT_UPLOADED;
            this.nFilesAdded += 1;
        } else { // File, already saved
            continue;
        }
        newStatuses.data.push(c);
        newStatuses.holders.push('(?,?,?,?)');
    }
    if (newStatuses.data.length) { commons.db.insert(
        'insert or replace into uploadStatuses values ' + newStatuses.holders.join(','),
        function(stmt) {
            newStatuses.data.forEach(function(item, i) {
                var stride = i * 4;
                stmt.bindString(stride, item.url);
                stmt.bindString(stride + 1, item.hash);
                stmt.bindInt(stride + 2, item.uploadStatus);
                stmt.bindInt(stride + 3, item.isFile);
            });
        });
        return true;
    }
    return false;
};


// == LocalDiff ====
// =============================================================================
function LocalDiff() {
    this.nPagesAdded = 0;   // The number of completely new pages
    this.nPagesRemoved = 0; // The number of completely removed pages (refCount==0)
    this.nLinksAdded = 0;   // The number of new links added to the root page
    this.nLinksRemoved = 0; // The number of links removed from the root page
    this.removedLinkUrls = {};
    this.staticFiles = {};  // A list of script/css urls
    this.remoteDiff = new exports.RemoteDiff(); // use exports so it can be mocked
}

/**
 * Scans $pages for new/removed links+static urls updating website.siteGraph
 * along the way.
 *
 * @param {Page[]} pages
 * @param {string?} usersOfLayout '' == scan all pages, 'foo.jsx.htm' == scan only pages rendered by 'foo.jsx.htm'
 */
LocalDiff.prototype.scanChanges = function(pages, usersOfLayout) {
    var completelyNewPages = {};
    for (var url in pages) {
        var page = pages[url];
        if (page.refCount < 1 || (usersOfLayout && page.layoutFileName != usersOfLayout)) continue;
        var newLinksTo = {};
        var domTree = page.dryRun();
        this.remoteDiff.addPageToCheck(page);
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
                    layout = siteGraph.addTemplate(props.layoutOverride, false, true);
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
                if (fileUrl.charAt(0) == '/' || hasBase) {
                    this.staticFiles[fileUrl] = 1;
                } else {
                    commons.log('[Warn]: The urls of local script/styles should start with \'/\'.');
                    this.staticFiles['/' + fileUrl] = 1;
                }
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
        siteGraph.pages[url].refCount += 1;
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

LocalDiff.prototype.deleteUnreachablePages = function() {
    var homeUrl = website.siteConfig.homeUrl;
    for (var url in this.removedLinkUrls) {
        var r = siteGraph.pages[url].refCount;
        if (r < 1 && url != homeUrl) {
            delete siteGraph.pages[url];
            this.nPagesRemoved += 1;
        }
    }
};

exports.RemoteDiff = RemoteDiff;