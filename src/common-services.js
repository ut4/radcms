const ReadableStream = require('stream').Readable;
const parseUrl = require('url').parse;
const ftp = require('basic-ftp');
const chokidar = require('chokidar');

/**
 * # common-services.js
 *
 * In this file:
 *
 * ## signals: singleton
 * ## fileWatcher: singleton
 * ## Uploader: class
 * ## FTPResponseCode: object|enum
 *
 */

const signals = {
    _listeners: [],
    /**
     * @param {string} whichSignal
     * @param {function} fn
     */
    listen(whichSignal, fn) {
        this._listeners.push({listeningTo: whichSignal, fn: fn});
    },
    /**
     * @param {string} whichSignal
     * @param {any?} arg
     */
    emit(whichSignal, arg) {
        const l = this._listeners.length;
        for (let i = 0; i < l; ++i) {
            const listener = this._listeners[i];
            if (listener.listeningTo == whichSignal &&
                listener.fn(arg) === false) break;
        }
    }
};

////////////////////////////////////////////////////////////////////////////////

let watcher = null;
let lastAddEventFileName = '';
let addEventDispatchTimeout = 0;

const fileWatcher = {
    _watchFn: null,
    EVENT_ADD: 'add',
    EVENT_ADD_DIR: 'addDir',
    EVENT_CHANGE: 'change',
    EVENT_RENAME: 'rename',
    EVENT_UNLINK: 'unlink',
    EVENT_UNLINK_DIR: 'unlinkDir',
    EVENT_READY: 'ready',
    EVENT_RAW: 'raw',
    EVENT_ERROR: 'error',
    /**
     * @param {(eventType: string; fileName: string): any} fn
     */
    setWatchFn(watchFn) {
        this._watchFn = watchFn;
    },
    /**
     * @param {string} path eg. '/full/path/to/my/site/'
     * @param {string} exts eg. 'txt|png|jpg'
     */
    watch(path, exts) {
        if (watcher) {
            resetAddEventTimeout();
            watcher.close();
        }
        let outDirPath = path + 'out/';
        if (process.platform == 'win32') outDirPath = outDirPath.replace(/\//g, '\\');
        watcher = chokidar.watch(path, {
            cwd: path,
            ignored: new RegExp(
                // Ignore paths that start with $path + 'out/' (eg. '/full/path/to/my/site/out/')
                '^' + outDirPath + '|'+
                // Ignore files that don't have one of these extensions
                '^(?!.*(' + (exts ? exts + '|' : '') + 'ini|jsx|htm)$).*$'
            ),
            disableGlobbing: true,
            ignoreInitial: true,
            depth: 1
        }).on('all', (event, fileName) => {
            fileName = fileName.replace(/\\/g, '/');
            if (event === this.EVENT_ADD) {
                lastAddEventFileName = fileName;
                addEventDispatchTimeout = setTimeout(() => {
                    lastAddEventFileName = '';
                    this._watchFn(event, fileName);
                }, 120);
                return;
            } else if (event === this.EVENT_UNLINK) {
                if (lastAddEventFileName) { // add hasn't fired yet -> must be a rename
                    fileName += '>' + lastAddEventFileName;
                    event = this.EVENT_RENAME;
                    resetAddEventTimeout();
                }
            }
            this._watchFn(event, fileName);
        });
    }
};

function resetAddEventTimeout() {
    lastAddEventFileName = '';
    clearTimeout(addEventDispatchTimeout);
}

////////////////////////////////////////////////////////////////////////////////

class Uploader {
    constructor() {
        this.client = new ftp.Client();
        this.remoteUrl = null;
    }
    /**
     * @param {string} remoteUrl eg. 'ftp://ftp.mysite.net/public_html'
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{code: number; message: string;}>}
     */
    open(remoteUrl, username, password) {
        this.remoteUrl = parseUrl(remoteUrl);
        return this.client.access({
            host: this.remoteUrl.host, // 'ftp.mysite.net'
            user: username,
            password: password
        });
    }
    /**
     * @param {string} remoteFileName eg. '/file.txt'
     * @param {string|Buffer} contents
     * @returns {Promise<{code: number; message: string;}>}
     */
    upload(remoteFileName, contents) {
        const stream = new ReadableStream();
        stream.push(contents);
        stream.push(null);
        const pcs = remoteFileName.split('/');
        pcs.shift(); // ['', 'file.txt' ...] -> ['file.txt' ...]
        if (pcs.length > 1) {
            const fileName = pcs.pop();
            return this.client
                .ensureDir(this.remoteUrl.pathname + '/' + pcs.join('/'))
                .then(() => this.client.upload(stream, fileName));
        }
        return this.client.upload(stream, this.remoteUrl.pathname + remoteFileName);
    }
    /**
     * @param {string} remoteFileName eg. '/file.html'
     * @param {bool?} asDir = false false = delete only '/foo/file.txt',
     *                              true = delete also dir '/foo' after deleting '/foo/file.txt'
     * @returns {Promise<{code: number; message: string;}>}
     */
    delete(remoteFileName, asDir) {
        return !asDir
            ? this.client.remove(this.remoteUrl.pathname + remoteFileName)
            : this.client.removeDir(this.remoteUrl.pathname +
                remoteFileName.substr(0, remoteFileName.lastIndexOf('/')));
    }
    /**
     * @param {number} ftpStatusCode
     * @returns {bool}
     */
    static isLoginError(ftpStatusCode) {
        return ftpStatusCode >= 300 && ftpStatusCode <= 350;
    }
}

const FTPResponseCode = {
    TRANSFER_COMPLETE: 226
};

exports.signals = signals;
exports.fileWatcher = fileWatcher;
exports.Uploader = Uploader;
exports.FTPResponseCode = FTPResponseCode;
