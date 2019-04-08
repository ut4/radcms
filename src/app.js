/**
 * # app.js
 *
 * This file contains the global state of RadCMS.
 *
 */
const fs = require('fs');
const Sqlite = require('better-sqlite3');
const data = require('./static-data.js');
const {Website} = require('./website.js');

const DATA_DIR_NAME = 'radcms';

let app = {
    /** @property {string} eg. 'c:/users/<user>/' */
    homePath: '',
    /** @property {string} eg. 'c:/users/<user>/AppData/Roaming/radcms/' */
    dataPath: '',
    db: null,
    currentWebsite: null,
    waitingWebsite: null,// A kind of back buffer, used in setCurrentWebsite()
    /**
     * Opens or creates the main database $this.dataPath+'data.db'.
     *
     * @param {Object?} dbSettings
     */
    initAndInstall(dbSettings) {
        if (!dbSettings && !fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, {recursive: true});
        }
        this.db = new Sqlite(this.dataPath + 'data.db', dbSettings);
        this._populateDatabaseIfEmpty();
    },
    /**
     * Sets $this.currentWebsite.
     */
    setCurrentWebsite(dirPath, skipActivate) {
        if (!this.waitingWebsite || this.waitingWebsite.dirPath != dirPath) {
            this.currentWebsite = new Website(dirPath);
            this.waitingWebsite = null;
        } else {
            this.currentWebsite = this.waitingWebsite;
            this.waitingWebsite = null;
        }
        if (!skipActivate) this.currentWebsite.activate();
    },
    /**
     * Sets $this.waitingWebsite = new Website($dirPath, $dbSettings).
     * @see Website @website.js
     */
    setWaitingWebsite: function(dirPath, dbSettings) {
        this.waitingWebsite = new Website(dirPath, dbSettings);
        this.waitingWebsite.setApp(this);
    },
    /**
     * Populates $this.db, or does nothing if the file was already populated.
     * (Note that this method can be called only once.)
     */
    _populateDatabaseIfEmpty() {
        if (this.db.prepare('select count(`type`) as c from sqlite_master').get().c < 1) {
            this.db.exec(data.getNamedSql(':mainSchema:'));
        }
        // self-destruct
        this._populateDatabaseIfEmpty = () => {};
    },
    log(...args) {
        /* eslint-disable no-console */
        console.log(...args);
    }
};

if (process.env.APPDATA) { // win
    // C:/Users/<user>/AppData/Roaming/radcms/
    app.dataPath = normalizePath(process.env.APPDATA) + DATA_DIR_NAME + '/';
    app.homePath = app.dataPath.split('/').slice(0, 3).join('/') + '/'; // 5==['c','users','<user>'].length
} else if (process.platform === 'darwin') { // macOs
    // /Users/<user>/
    app.homePath = normalizePath(process.env.HOME);
    app.dataPath = app.homePath + 'Library/Preferences/' + DATA_DIR_NAME + '/';
} else if (process.platform === 'linux') {
    // /home/<user>/
    app.homePath = normalizePath(process.env.HOME);
    app.dataPath = app.homePath + '.config/' + DATA_DIR_NAME + '/';
} else {
    throw new Error('Unsupported platform "' + process.platform + '".');
}

////////////////////////////////////////////////////////////////////////////////

function normalizePath(path) {
    path = path.split('\\').join('/');
    return path.charAt(path.length - 1) === '/' ? path : path + '/';
}

exports.app = app;
