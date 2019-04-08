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
    const diff = new LocalDiff(new RemoteDiff(website));
    const siteGraph = website.graph;
    diff.scanChanges(siteGraph.pages, usersOf);
    diff.deleteUnreachablePages();
    diff.remoteDiff.saveStatusesToDb();
    if (diff.nLinksAdded || diff.nLinksRemoved) {
        website.saveToDb(siteGraph);
    }
    const m = [];
    if (diff.nPagesAdded) m.push('added ' + diff.nPagesAdded + ' page(s)');
    if (diff.nPagesRemoved) m.push('removed ' + diff.nPagesRemoved + ' page(s)');
    if (diff.nLinksAdded) m.push('added ' + diff.nLinksAdded + ' link(s)');
    if (diff.nLinksRemoved) m.push('removed ' + diff.nLinksRemoved + ' link(s)');
    if (diff.remoteDiff.nNewFiles) m.push('discovered ' + diff.remoteDiff.nNewFiles +
        ' file resources');
    app.log('[Info]: Rescanned the site' + (m.length ? ': ' + m.join(', ') : ''));
};

class RemoteDiff {
    /**
     * @param {Website} website
     */
    constructor(website) {
        /** @prop {[string]: {url: string; hash: string; uphash: string; isFile: bool;}} */
        this.checkables = {};
        this.deletables = {};
        this.nNewFiles = 0;
        this.nNewFilesAdded = 0;
        this.website = website;
    }
    /**
     * @param {string} url
     * @param {string} html
     */
    addPageToCheck(url, html) {
        if (!this.checkables.hasOwnProperty(url)) {
            this.checkables[url] = {url: url, hash: exports.sha1(html),
                                    uphash: null, isFile: 0};
        }
    }
    /**
     * @param {string} url Always starts with '/' i.e. '/foo.css', '/bar.js'
     */
    addFileToCheck(url) {
        this.checkables[url] = {url: url, hash: null, uphash: null, isFile: 1};
    }
    /**
     * @param {string} url
     */
    addPageToDelete(url) {
        this.deletables[url] = {url: url, hash: null, uphash: null, isFile: 0};
    }
    /**
     * Traverses $this.checkables and $this.deletables, and saves their new
     * checksums to the database.
     */
    saveStatusesToDb() {
        // Select current static file urls (css/js) from the database
        const statics = {};
        this._syncStaticFileUrlsToDb(statics);
        // Select current checksums from the database
        const curStatuses = {};
        if (!this._getCurrentStatuses(curStatuses)) return;
        // Collect files that were new, and pages which contents were changed
        const newStatuses = {vals: [], holders: []};
        for (const url in this.checkables) {
            const c = this.checkables[url];
            const curStatus = curStatuses[c.url];
            if (!c.isFile) { // Page
                if (curStatus) {
                    // Current content identical with the uploaded content -> skip
                    if (curStatus.uphash && curStatus.uphash === c.hash &&
                        curStatus.curhash === c.hash) continue;
                    // else -> fall through & save new curhash
                    c.uphash = curStatus.uphash;
                }
            } else if (!curStatus) { // File, not yet saved to the db
                const statc = statics[url];
                if (statc.isOk) { // Ok -> fall through & save new curhash
                    c.hash = statc.newHash;
                    this.nNewFilesAdded += 1;
                } else { // Not ok (doesn't exists etc.) -> skip
                    continue;
                }
            } else { // File, already saved -> skip
                continue;
            }
            newStatuses.vals.push(c.url, c.hash, c.uphash, c.isFile);
            newStatuses.holders.push('(?,?,?,?)');
        }
        // Collect pages that were removed
        const removedStatuses = {urls: [], holders: []};
        for (const url in this.deletables) {
            const item = this.deletables[url];
            item.uphash = curStatuses[url] ? curStatuses[url].uphash : null;
            if (item.uphash) { // is uploaded -> mark as deletable
                item.hash = null;
                newStatuses.vals.push(item.url, item.hash, item.uphash, item.isFile);
                newStatuses.holders.push('(?,?,?,?)');
            } else { // exists only locally -> remove the status completely
                removedStatuses.urls.push(item.url);
                removedStatuses.holders.push('?');
            }
        }
        if (newStatuses.vals.length) this.website.db
            .prepare('insert or replace into uploadStatuses values ' + newStatuses.holders.join(','))
            .run(newStatuses.vals);
        if (removedStatuses.urls.length) this.website.db
            .prepare('delete from uploadStatuses where url in (' + removedStatuses.holders.join(',') + ')')
            .run(removedStatuses.urls);
    }
    /**
    * Picks all static file urls from $this.checkables, and syncs them to the
    * database.
    */
    _syncStaticFileUrlsToDb(currentUrls) {
        const select = {urls: [], holders: []};
        for (const url in this.checkables) {
            if (!this.checkables[url].isFile) continue;
            select.urls.push(url);
            select.holders.push('?');
        }
        if (!select.urls.length) return;
        //
        this.website.db.prepare('select `url`,`isOk` from staticFileResources where `url` in (' +
                        select.holders.join(',') + ')').raw().all(select.urls).forEach(row => {
            currentUrls[row[0]] = {isOk: row[1], newHash: null};
        });
        // Collect urls that weren't registered yet
        const insert = {vals: [], holders: []};
        for (let i = 0; i < select.urls.length; ++i) {
            const url = select.urls[i];
            if (!currentUrls.hasOwnProperty(url)) { // Completely new url
                try {
                    currentUrls[url] = {isOk: 1, newHash:
                        exports.sha1(this.website.readOwnFile(url))};
                    insert.vals.push(url, 1);
                } catch (e) {
                    currentUrls[url] = {isOk: 0, newHash: null};
                    insert.vals.push(url,  0);
                }
                insert.holders.push('(?,?)');
                this.nNewFiles += 1;
            }
        }
        // Save the new urls if any
        if (insert.vals.length) this.website.db
            .prepare('insert into staticFileResources values' + insert.holders.join(','))
            .run(insert.vals);
    }
    _getCurrentStatuses(curStatuses) {
        const checkables = this.checkables;
        const deletables = this.deletables;
        const selectHolders = [];
        const allUrls = [];
        for (var url in checkables) { selectHolders.push('?'); allUrls.push(url); }
        for (url in deletables) { selectHolders.push('?'); allUrls.push(url); }
        if (!allUrls.length) return false;
        //
        this.website.db.prepare('select * from uploadStatuses where `url` in (' +
            selectHolders.join(',') + ')').raw().all(allUrls).forEach(row => {
                curStatuses[row[0]] = {curhash: row[1], uphash: row[2], isFile: row[3]};
            });
        return true;
    }
}

////////////////////////////////////////////////////////////////////////////////

class LocalDiff {
    constructor(remoteDiff) {
        this.nPagesAdded = 0;   // The number of completely new pages
        this.nPagesRemoved = 0; // The number of completely removed pages (refCount==0)
        this.nLinksAdded = 0;   // The number of new links added
        this.nLinksRemoved = 0; // The number of links removed
        this.removedLinkUrls = {};
        this.staticFiles = {};  // A list of script/css urls
        this.remoteDiff = remoteDiff; // use exports so it can be mocked
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
                        (fileUrl = el.props.href) &&
                        el.props.rel === 'stylesheet'
                    )) &&
                    fileUrl.indexOf('//') === -1 // reject 'http(s)://foo.js' and '//foo.js'
                ) {
                    if (fileUrl.charAt(0) !== '/' && !hasBase) {
                        fileUrl = '/' + fileUrl;
                        app.log('[Warn]: The urls of local script/styles should start with \'/\'.');
                    }
                    this.staticFiles[fileUrl] = 1;
                    this.remoteDiff.addFileToCheck(fileUrl);
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
