const crypto = require('crypto');

/**
 * # website-diff.js
 *
 * This file contains logic for the automatic page scanning, and the tracking of
 * remote <-> local content.
 *
 */
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
            this.checkables[url] = {url: url, hash: sha1(html),
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
            item.uphash = curStatuses[url].uphash;
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
                        sha1(this.website.readTemplate(url.substr(1)))};
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

/**
 * @param {string} str
 * @returns {string} sha1 eg. da39a3ee5e6b4b0d3255bfef95601890afd80709
 */
function sha1(str) {
    return crypto.createHash('sha1').update(str).digest('hex');
}

exports.RemoteDiff = RemoteDiff;
exports.sha1 = sha1;
