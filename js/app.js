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
    currentWebsite: null,
    _routeMatchers: [],
    /**
     * Opens or creates the main database $insnEnv.dataPath+'data.db', where
     * $insnEnv.dataPath is 'c:/Users/<user>/AppData/Roaming/insane/' (win),
     * 'todo' (linux), or 'todo' (macOs).
     */
    initAndInstall: function() {
        this.db = new Db(insnEnv.dataPath + 'data.db');
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
     * Sets $this.currentWebsite = new Website($dirPath, $dbUrl).
     * @see Website @website.js
     */
    setCurrentWebsite: function(dirPath, dbUrl) {
        this.currentWebsite = new Website(dirPath, dbUrl);
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
