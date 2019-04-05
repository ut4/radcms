const ReadableStream = require('stream').Readable;
const parseUrl = require('url').parse;
const ftp = require('basic-ftp');

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

let signals = {
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
        let l = this._listeners.length;
        for (let i = 0; i < l; ++i) {
            let listener = this._listeners[i];
            if (listener.listeningTo == whichSignal &&
                listener.fn(arg) === false) break;
        }
    }
};

////////////////////////////////////////////////////////////////////////////////

let fileWatcher = {
    watch() {
        //
    }
};

////////////////////////////////////////////////////////////////////////////////

class Uploader {
    constructor() {
        this.client = new ftp.Client();
        this.remoteUrl = null;
    }
    /**
     * @param {string} remoteUrl eg. 'ftp://ftp.mysite.net/public_html[/]'
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
     * @param {string} contents
     * @returns {Promise<{code: number; message: string;}>}
     */
    upload(remoteFileName, contents) {
        const stream = new ReadableStream();
        stream.push(contents);
        stream.push(null);
        return this.client.upload(stream, this.remoteUrl.pathname + remoteFileName);
    }
    /**
     * @param {string} itemPath eg. '/file.html'
     * @param {bool?} asDir = false false = delete only '/foo/file.txt',
     *                              true = delete also dir '/foo' after deleting '/foo/file.txt'
     * @returns {Promise<{code: number; message: string;}>}
     */
    delete(itemPath, asDir) {
        // TODO this.client.remove(filename, ignoreErrorCodes = false)
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
