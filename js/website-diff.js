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
    var diff = new Diff();
    diff.scanChanges(siteGraph.pages, usersOf);
    diff.deleteUnreachablePages();
    for (var hadStaticFiles in diff.staticFiles) {
        saveNewStaticFileUrlsToDb(diff.staticFiles);
        break;
    }
    if (siteGraph.hasUnsavedChanges || diff.nLinksAdded || diff.nLinksRemoved) {
        website.saveToDb(siteGraph);
        siteGraph.hasUnsavedChanges = false;
    }
    var m = [];
    if (diff.nPagesAdded) m.push('added ' + diff.nPagesAdded + ' page(s)');
    if (diff.nPagesRemoved) m.push('removed ' + diff.nPagesRemoved + ' page(s)');
    if (diff.nLinksAdded) m.push('found ' + diff.nLinksAdded + ' new link(s)');
    if (diff.nLinksRemoved) m.push('removed ' + diff.nLinksRemoved + ' link(s)');
    if (hadStaticFiles) m.push('found new file resources');
    commons.log('[Info]: Rescanned the site: ' + (m.length ? m.join(', ') : 'no changes'));
};

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
 * @param {string?} usersOfLayout '' == scan all pages, 'foo.jsx.htm' == scan only pages rendered by 'foo.jsx.htm'
 */
Diff.prototype.scanChanges = function(pages, usersOfLayout) {
    var completelyNewPages = {};
    for (var url in pages) {
        var page = pages[url];
        if (page.refCount < 1 || (usersOfLayout && page.layoutFileName != usersOfLayout)) continue;
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

/**
 * @param {string} url
 * @param {Page} fromPage
 */
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
 * @param {string[]} urls Always starts with '/' i.e. ['/foo.css', '/bar.js']
 * @throws {Error}
 */
function saveNewStaticFileUrlsToDb(urls) {
    var selectHolders = [];
    for (var hadUrls in urls) {
        selectHolders.push('?');
    }
    if (!hadUrls) {
        return;
    }
    // Select urls (that were in the template) from the database
    var oldUrls = {};
    commons.db.select('select `url` from staticFileResources where `url` in (' +
        selectHolders.join(',') + ')', function(row) {
            oldUrls[row.getString(0)] = 1;
        }, function(stmt) {
            var i = 0; for (var url in urls) {
                stmt.bindString(i++, url);
            }
        });
    // Generate sha1s for urls/files that weren't in the database yet
    var newUrls = {holders: [], data: []};
    for (var url in urls) {
        if (!oldUrls.hasOwnProperty(url)) {
            newUrls.data.push({url: url, hash: website.website.crypto.sha1(
                website.website.fs.read(insnEnv.sitePath + url.substr(1))
            )});
            newUrls.holders.push('(?,?,?,?)');
        }
    }
    // Insert the new items to uploadStatuses and staticFileResources (by an
    // sqlite-trigger)
    if (newUrls.data.length) commons.db.insert(
        'insert into uploadStatuses values ' + newUrls.holders.join(','),
        function(stmt) {
            newUrls.data.forEach(function(item, i) {
                stmt.bindString(i * 4, item.url);      // url
                stmt.bindString(i * 4 + 1, item.hash); // hash
                stmt.bindInt(i * 4 + 2, website.NOT_UPLOADED);
                stmt.bindInt(i * 4 + 3, 1);            // isFile
            });
        });
}

exports.Diff = Diff;