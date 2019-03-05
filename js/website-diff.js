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


// == RemoteDiff ====
// =============================================================================
function RemoteDiff() {
    /** @prop {[string]: {url: string; hash: string; uphash: string; isFile: bool;}} */
    this.checkables = {};
    this.deletables = {};
    this.nNewFiles = 0;
    this.nNewFilesAdded = 0;
}

/**
 * @param {string} url
 * @param {string} html
 */
RemoteDiff.prototype.addPageToCheck = function(url, html) {
    if (!this.checkables.hasOwnProperty(url)) {
        this.checkables[url] = {url: url, hash: app.currentWebsite.crypto.
            sha1(html), uphash: null, isFile: 0};
    }
};

/**
 * @param {string} url Always starts with '/' i.e. '/foo.css', '/bar.js'
 */
RemoteDiff.prototype.addFileToCheck = function(url) {
    this.checkables[url] = {url: url, hash: null, uphash: null, isFile: 1};
};

/**
 * @param {string} url
 */
RemoteDiff.prototype.addPageToDelete = function(url) {
    this.deletables[url] = {url: url, hash: null, uphash: null, isFile: 0};
};

/**
 * Traverses $this.checkables and $this.deletables, and saves their new
 * checksums to the database.
 */
RemoteDiff.prototype.saveStatusesToDb = function() {
    // Select current static file urls (css/js) from the database
    var statics = {};
    this._syncStaticFileUrlsToDb(statics);
    // Select current checksums from the database
    var curStatuses = {};
    if (!this._getCurrentStatuses(curStatuses)) return;
    // Collect files that were new, and pages which contents were changed
    var newStatuses = {data: [], holders: []};
    for (var url in this.checkables) {
        var c = this.checkables[url];
        var curStatus = curStatuses[c.url];
        if (!c.isFile) { // Page
            if (curStatus) {
                // Current content identical with the uploaded content -> skip
                if (curStatus.uphash && curStatus.uphash == c.hash &&
                    curStatus.curhash == c.hash) continue;
                // else -> fall through & save new curhash
                c.uphash = curStatus.uphash;
            }
        } else if (!curStatus) { // File, not yet saved to the db
            var statc = statics[url];
            if (statc.isOk) { // Ok -> fall through & save new curhash
                c.hash = statc.newHash;
                this.nNewFilesAdded += 1;
            } else { // Not ok (doesn't exists etc.) -> skip
                continue;
            }
        } else { // File, already saved -> skip
            continue;
        }
        newStatuses.data.push(c);
        newStatuses.holders.push('(?,?,?,?)');
    }
    // Collect pages that were removed
    var removedStatuses = {urls: [], holders: []};
    for (url in this.deletables) {
        var item = this.deletables[url];
        item.uphash = curStatuses[url].uphash;
        if (item.uphash) { // is uploaded -> mark as deletable
            item.hash = null;
            newStatuses.data.push(item);
            newStatuses.holders.push('(?,?,?,?)');
        } else { // exists only locally -> remove the status completely
            removedStatuses.urls.push(item.url);
            removedStatuses.holders.push('?');
        }
    }
    if (newStatuses.data.length) app.currentWebsite.db.insert(
        'insert or replace into uploadStatuses values ' + newStatuses.holders.join(','),
        function(stmt) {
            newStatuses.data.forEach(function(item, i) {
                var stride = i * 4;
                stmt.bindString(stride, item.url);
                stmt.bindString(stride + 1, item.hash);
                stmt.bindString(stride + 2, item.uphash);
                stmt.bindInt(stride + 3, item.isFile);
            });
        }
    );
    if (removedStatuses.urls.length) app.currentWebsite.db.delete(
        'delete from uploadStatuses where url in (' + removedStatuses.holders.join(',') + ')',
        function(stmt) {
            removedStatuses.urls.forEach(function(url, i) {
                stmt.bindString(i, url);
            });
        }
    );
};

/**
* Picks all static file urls from $this.checkables, and syncs them to the
* database.
*
* @returns {Object} {url: isOk...}
*/
RemoteDiff.prototype._syncStaticFileUrlsToDb = function(currentUrls) {
    var select = {urls: [], holders: []};
    for (var url in this.checkables) {
        if (!this.checkables[url].isFile) continue;
        select.urls.push(url);
        select.holders.push('?');
    }
    if (!select.urls.length) return;
    //
    app.currentWebsite.db.select('select `url`,`isOk` from staticFileResources where `url` in (' +
                      select.holders.join(',') + ')', function(row) {
        currentUrls[row.getString(0)] = {isOk: row.getInt(1), newHash: null};
    }, function(stmt) {
        select.urls.forEach(function(url, i) {
            stmt.bindString(i, url);
        });
    });
    // Collect urls that weren't registered yet
    var insert = {data: [], holders: []};
    for (var i = 0; i < select.urls.length; ++i) {
        url = select.urls[i];
        if (!currentUrls.hasOwnProperty(url)) { // Completely new url
            try {
                currentUrls[url] = {isOk: 1, newHash:
                    app.currentWebsite.readFileAndCalcChecksum(url)};
                insert.data.push({url: url, isOk: 1});
            } catch (e) {
                currentUrls[url] = {isOk: 0, newHash: null};
                insert.data.push({url: url, isOk: 0});
            }
            insert.holders.push('(?,?)');
            this.nNewFiles += 1;
        }
    }
    // Save the new urls if any
    if (insert.data.length) app.currentWebsite.db.insert(
        'insert into staticFileResources values' + insert.holders.join(','),
        function(stmt) {
            insert.data.forEach(function(item, i) {
                stmt.bindString(i*2, item.url);
                stmt.bindInt(i*2+1, item.isOk);
            });
        });
};

RemoteDiff.prototype._getCurrentStatuses = function(curStatuses) {
    var checkables = this.checkables;
    var deletables = this.deletables;
    var selectHolders = [];
    for (var hadItems in checkables) selectHolders.push('?');
    for (hadItems in deletables) selectHolders.push('?');
    if (!hadItems) return false;
    //
    app.currentWebsite.db.select('select * from uploadStatuses where `url` in (' +
        selectHolders.join(',') + ')', function(row) {
            curStatuses[row.getString(0)] = {curhash: row.getString(1),
                uphash: row.getString(2), isFile: row.getInt(3)};
        }, function(stmt) {
            var i = 0;
            for (var url in checkables) stmt.bindString(i++, url);
            for (url in deletables) stmt.bindString(i++, url);
        });
    return true;
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