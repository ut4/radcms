/**
 * # website-diff.js
 *
 * This file contains logic for the automatic page scanning, and the tracking of
 * remote <-> local content.
 *
 */
const crypto = require('crypto');
const {app} = require('./app.js');
const {templateCache} = require('./templating.js');

/**
 * @param {string} type 'full' or 'usersOf:some-template.jsx.htm'
 */
const performRescan = type => {
    let usersOf = '';
    if (type != 'full') {
        usersOf = type.split(':')[1];
        if (!templateCache.has(usersOf)) return;
    }
    const website = app.currentWebsite;
    const diff = new LocalDiff(new exports.RemoteDiff(website));
    const siteGraph = website.graph;
    try {
        diff.scanChanges(siteGraph.pages, usersOf);
    } catch (e) {
        app.logException(e);
        return;
    }
    diff.deleteUnreachablePages();
    diff.remoteDiff.syncToDb();
    if (diff.nLinksAdded || diff.nLinksRemoved) {
        website.saveToDb(siteGraph);
    }
    const m = [];
    if (diff.nPagesAdded) m.push('added ' + diff.nPagesAdded + ' page(s)');
    if (diff.nPagesRemoved) m.push('removed ' + diff.nPagesRemoved + ' page(s)');
    if (diff.nLinksAdded) m.push('added ' + diff.nLinksAdded + ' link(s)');
    if (diff.nLinksRemoved) m.push('removed ' + diff.nLinksRemoved + ' link(s)');
    if (diff.nAssets) m.push('discovered ' + diff.nAssetsFound + ' asset files');
    app.log('[Info]: Rescanned the site' + (m.length ? ': ' + m.join(', ') : ''));
};

class RemoteDiff {
    /**
     * @param {Website} website
     */
    constructor(website) {
        /** @prop {[string]: {url: string; hash: string; uphash?: string;}} */
        this.discoveredPages = {};
        this.removedPages = {};
        /** @prop {[string]: {url: string; userPageUrl: string;}} */
        this.discoveredAssets = {};
        this.website = website;
    }
    /**
     * @param {string} url
     * @param {string} html
     */
    addPageToCheck(url, html) {
        if (!this.discoveredPages.hasOwnProperty(url)) {
            this.discoveredPages[url] = {url: url, hash: exports.sha1(html),
                                         uphash: null};
        }
    }
    /**
     * @param {string} url
     */
    addPageToDelete(url) {
        this.removedPages[url] = {url: url, hash: null, uphash: null};
    }
    /**
     * @param {string} url Always starts with '/' i.e. '/foo.css', '/bar.js'
     * @param {string} userPageUrl Url of the page where $url's element was discovered
     */
    addAssetToCheck(url, pageUrl) {
        this.discoveredAssets[url] = {url: url, userPageUrl: pageUrl};
    }
    /**
     */
    syncToDb() {
        this._syncAssetFileUrls();
        const pageStatuses = {};
        if (!this._getCurrentPageStatuses(pageStatuses)) return;
        const updatedStatuses = {vals: [], holders: []};
        for (const url in this.discoveredPages) {
            const c = this.discoveredPages[url];
            const curStatus = pageStatuses[c.url];
            if (curStatus) {
                // Current content identical with the uploaded content -> skip
                if (curStatus.uphash && curStatus.uphash === c.hash &&
                    curStatus.curhash === c.hash) continue;
                // else -> fall through & save new curhash
                c.uphash = curStatus.uphash;
            }
            updatedStatuses.vals.push(c.url, c.hash, c.uphash, 0);
            updatedStatuses.holders.push('(?,?,?,?)');
        }
        const removedStatuses = {urls: [], holders: []};
        for (const url in this.removedPages) {
            const item = this.removedPages[url];
            item.uphash = pageStatuses[url].uphash;
            if (item.uphash) { // is uploaded -> mark as deletable
                item.hash = null;
                updatedStatuses.vals.push(item.url, item.hash, item.uphash);
                updatedStatuses.holders.push('(?,?,?,0)');
            } else { // exists only locally -> remove the status completely
                removedStatuses.urls.push(item.url);
                removedStatuses.holders.push('?');
            }
        }
        if (updatedStatuses.vals.length) this.website.db
            .prepare('insert or replace into uploadStatuses values ' + updatedStatuses.holders.join())
            .run(updatedStatuses.vals);
        if (removedStatuses.urls.length) this.website.db
            .prepare('delete from uploadStatuses where url in (' + removedStatuses.holders.join() + ')')
            .run(removedStatuses.urls);
    }
    _syncAssetFileUrls() {
        const insert = {vals: [], holders: []};
        for (const url in this.discoveredAssets) {
            insert.vals.push(url, this.discoveredAssets[url].userPageUrl);
            insert.holders.push('(?,?)');
        }
        if (!insert.vals.length) return;
        // Insert references even for urls that don't exist on disk (assetFiles)
        this.website.db.prepare('insert or replace into assetFileRefs values ' +
                                insert.holders.join()).run(insert.vals);
        // Insert checksums for urls that exist on disk, but don't have it yet
        const statusesToInsert = {vals: [], holders: []};
        const urls = Object.keys(this.discoveredAssets);
        this.website.db
            .prepare('select a.`url` from assetFiles a left join ' +
                     'uploadStatuses u on (u.`url` = a.`url`) where ' +
                     'u.`url` is null and a.`url` in (' +
                      urls.map(()=>'?').join() + ')')
            .raw().all(urls).forEach(row => {
                statusesToInsert.vals.push(row[0],
                    exports.sha1(this.website.readOwnFile(row[0])));
                statusesToInsert.holders.push('(?,?,null,1)'); // url, curhash, uphash, isFile
            });
        if (statusesToInsert.vals.length) this.website.db
            .prepare('insert into uploadStatuses values ' + statusesToInsert.holders.join())
            .run(statusesToInsert.vals);
    }
    _getCurrentPageStatuses(out) {
        const discoveredPages = this.discoveredPages;
        const removedPages = this.removedPages;
        const selectHolders = [];
        const allUrls = [];
        for (var url in discoveredPages) { selectHolders.push('?'); allUrls.push(url); }
        for (url in removedPages) { selectHolders.push('?'); allUrls.push(url); }
        if (!allUrls.length) return false;
        //
        this.website.db.prepare('select * from uploadStatuses where `url` in (' +
            selectHolders.join() + ') and `isFile` = 0').raw().all(allUrls).forEach(row => {
                out[row[0]] = {curhash: row[1], uphash: row[2]};
            });
        return true;
    }
}

////////////////////////////////////////////////////////////////////////////////

class LocalDiff {
    /** @param {RemoteDiff} remoteDiff */
    constructor(remoteDiff) {
        this.nPagesAdded = 0;   // The number of completely new pages
        this.nPagesRemoved = 0; // The number of completely removed pages (refCount==0)
        this.nLinksAdded = 0;   // The number of new links added
        this.nLinksRemoved = 0; // The number of links removed
        this.nAssetsFound = 0;  // The number of script/css/img urls discovered
        this.removedLinkUrls = {};
        this.assetFiles = {};   // A list of script/css/img urls
        this.remoteDiff = remoteDiff;
        this.assetFileExts = remoteDiff.website.config.assetFileExts;
    }
    /**
     * Scans $pages for new/removed links+static urls updating website.graph
     * along the way.
     *
     * @param {Page[]} pages
     * @param {string?} usersOfLayout '' == scan all pages, 'foo.jsx.htm' == scan only pages rendered by 'foo.jsx.htm'
     */
    scanChanges(pages, usersOfLayout) {
        const completelyNewPages = {};
        const RadLink = templateCache.get('RadLink');
        const website = this.remoteDiff.website;
        for (const url in pages) {
            const page = pages[url];
            if (page.refCount < 1 || (usersOfLayout && page.layoutFileName != usersOfLayout)) continue;
            const newLinksTo = {};
            const [domTree, tree, html] = website.renderPage2(page);
            this.remoteDiff.addPageToCheck(page.url, html);
            const fnCmps = domTree.getRenderedFnComponents(tree);
            let l = fnCmps.length;
            for (var i = 0; i < l; ++i) {
                const props = fnCmps[i].props;
                if (fnCmps[i].fn !== RadLink) continue;
                const href = props.to;
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
            for (const url2 in page.linksTo) {
                if (!newLinksTo[url2]) this.removeLink(url2, page);
            }
            page.linksTo = newLinksTo;
            //
            const els = domTree.getRenderedElements(tree);
            let fileUrl = null;
            let hasBase = false;
            l = els.length;
            for (i = 0; i < l; ++i) {
                const el = els[i];
                if (((
                        el.tagName === 'script' &&
                        (fileUrl = el.props.src)
                    ) || (
                        el.tagName === 'link' &&
                        el.props.rel &&
                        (fileUrl = el.props.href) &&
                        (el.props.rel.indexOf('stylesheet') > -1 ||
                         el.props.rel.indexOf('icon') > -1)
                    ) || (
                        el.tagName === 'img' &&
                        (fileUrl = el.props.src)
                    )) &&
                    fileUrl.indexOf('//') === -1 // reject 'http(s)://foo.js' and '//foo.js'
                ) {
                    if (fileUrl.charAt(0) !== '/' && !hasBase) {
                        app.log('[Warn]: The urls of local files should start ' +
                            'with "/" (was "' + fileUrl + '").');
                        fileUrl = '/' + fileUrl;
                    }
                    this.assetFiles[fileUrl] = 1;
                    this.nAssetsFound += 1;
                    this.remoteDiff.addAssetToCheck(fileUrl, page.url);
                } else if (!hasBase && el.tagName === 'base' && (fileUrl = el.href)) {
                    hasBase = fileUrl.charAt(fileUrl.length - 1) === '/';
                }
            }
        }
        for (const _ in completelyNewPages) {
            this.scanChanges(completelyNewPages);
            break;
        }
    }
    /**
     * @param {string} url
     * @param {Page} toPage
     * @param {bool} isNewPage
     */
    addLink(url, toPage, isNewPage) {
        this.nLinksAdded += 1;
        if (isNewPage) {
            this.nPagesAdded += 1;
        }
        toPage.linksTo[url] = 1;
        if (toPage.url != url) {
            this.remoteDiff.website.graph.pages[url].refCount += 1;
        }
    }
    /**
     * @param {string} url
     * @param {Page} fromPage
     */
    removeLink(url, fromPage) {
        if (fromPage.linksTo[url] === 0) return; // Already removed from this page
        this.nLinksRemoved += 1;
        if (url !== fromPage.url) {
            fromPage.linksTo[url] = 0;
            this.removedLinkUrls[url] = 1;
            const p = this.remoteDiff.website.graph.pages[url];
            // Doesn't link to anywhere anymore -> recurse
            if (--p.refCount === 0) {
                for (const url2 in p.linksTo) {
                    if (p.linksTo[url2] === 1 && url2 != p.url) {
                        this.removeLink(url2, p);
                    }
                }
            }
        }
    }
    deleteUnreachablePages() {
        const homeUrl = this.remoteDiff.website.config.homeUrl;
        const siteGraph = this.remoteDiff.website.graph;
        for (const url in this.removedLinkUrls) {
            const r = siteGraph.pages[url].refCount;
            if (r < 1 && url != homeUrl) {
                delete siteGraph.pages[url];
                this.remoteDiff.addPageToDelete(url);
                this.nPagesRemoved += 1;
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

/**
 * @param {string} str
 * @returns {string} sha1 eg. da39a3ee5e6b4b0d3255bfef95601890afd80709
 */
function sha1(str) {
    return crypto.createHash('sha1').update(str).digest('hex');
}

exports.RemoteDiff = RemoteDiff;
exports.LocalDiff = LocalDiff;
exports.performRescan = performRescan;
exports.sha1 = sha1;
