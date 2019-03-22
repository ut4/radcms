/**
 * == app.js ====
 *
 * This file holds the global state of this application.
 *
 */
var Db = require('common-services.js').Db;
var Website = require('website.js').Website;

exports.app = {
    db: null,
    waitingWebsite: null, // A kind of back buffer, used in setCurrentWebsite()
    currentWebsite: null,
    _routeMatchers: [],
    /**
     * Opens or creates the main database $insnEnv.dataPath+'data.db', where
     * $insnEnv.dataPath is 'c:/Users/<user>/AppData/Roaming/insane/' (win),
     * 'todo' (linux), or 'todo' (macOs).
     */
    initAndInstall: function(dbPath) {
        this.db = new Db(dbPath || insnEnv.dataPath + 'data.db');
        this.populateDatabaseIfEmpty();
    },
    /**
     * Populates $insnEnv.appPath+'data.db', or does nothing if the file was
     * already populated. (Note that this method can be called only once.)
     *
     * @native
     */
    populateDatabaseIfEmpty: function() {},
    /**
     * Sets $this.currentWebsite.
     */
    setCurrentWebsite: function(dirPath, skipActivate) {
        if (!this.waitingWebsite || this.waitingWebsite.dirPath != dirPath) {
            this.currentWebsite = new Website(dirPath);
            this.waitingWebsite = null;
        } else {
            this.currentWebsite = this.waitingWebsite;
            this.waitingWebsite = null;
        }
        if (!skipActivate) this.currentWebsite.activate();
        insnEnv.setProp('currentWebsiteDirPath', dirPath);
    },
    /**
     * Sets $this.waitingWebsite = new Website($dirPath, $dbUrl).
     * @see Website @website.js
     */
    setWaitingWebsite: function(dirPath, dbUrl) {
        this.waitingWebsite = new Website(dirPath, dbUrl);
        this.waitingWebsite.setApp(this);
    },
    /**
     * @param {(url: string, method: string): Function|null} fn
     */
    addRoute: function(fn) {
        if (typeof fn != 'function') {
            throw new TypeError('A handler must be a function.');
        }
        this._routeMatchers.push(fn);
    }
};
