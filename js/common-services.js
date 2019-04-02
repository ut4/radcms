/**
 * == common-services.js ====
 *
 * In this file:
 *
 * - fileWatcher (singleton)
 * - transpiler (singleton)
 * - Uploader (class)
 * - DomTree (class)
 *
 */

// == fileWatcher-singleton ====
// =============================================================================
exports.fileWatcher = {
    timer: performance,
    dirPath: null,
    _watchFn: null,
    EVENT_NOTICE_WRITE: 0,
    EVENT_NOTICE_REMOVE: 1,
    EVENT_CREATE: 2,
    EVENT_WRITE: 3,
    EVENT_CHMOD: 4,
    EVENT_REMOVE: 5,
    EVENT_RENAME: 6,
    EVENT_RESCAN: 7,
    EVENT_ERROR: 8,
    /**
     * @param {(eventType: number, fileName: string): void} fn
     */
    setWatchFn: function(fn) {
        if (typeof fn != 'function') {
            throw new TypeError('watchFn must be a function.');
        }
        this._watchFn = fn;
    },
    /**
     * @native
     * @param {string} path eg. '/full/path/to/my/site/'
     * @throws {Error}
     */
    watch: function(/*dir*/) {},
    /**
     * @native
     */
    stop: function() {}
};


// == transpiler-singleton ====
// =============================================================================
exports.transpiler = {
    /**
     * @native
     * @param {string} code
     * @param {string} fileName For debugging
     * @param {bool?} doDukWrap = true
     * @returns {Function}
     * @throws {Error}
     */
    transpileToFn: function(/*code, fileName, doDukWrap*/) {}
};


// == Uploader ====
// =============================================================================
exports.UploaderStatus = Object.freeze({
    UPLOAD_OK: 0,
    UPLOAD_COULDNT_READ_FILE: 37, // these values are same as CURLE_*
    UPLOAD_LOGIN_DENIED: 67
});
/**
 * @native
 * @param {string} username
 * @param {string} password
 * @constructor
 */
exports.Uploader = function(/*username, password*/) {};
/**
 * @native
 * @param {string} url eg. 'ftp://ftp.mysite.net/public_html/file.html'
 * @param {string} string
 * @returns {number} eg. Uploader.UPLOAD_*
 */
exports.Uploader.prototype.uploadString = function(/*url, string*/) {};
/**
 * @native
 * @param {string} url
 * @param {string} filePath eg. 'c:/foo/file.txt'
 * @returns {number}
 */
exports.Uploader.prototype.uploadFile = function(/*url, filePath*/) {};
/**
 * @native
 * @param {string} serverUrl eg. 'ftp://ftp.mysite.net/public_html'
 * @param {string} itemPath eg. '/file.html'
 * @param {bool?} asDir = false false = delete only '/foo/file.txt',
 *                              true = delete also dir '/foo' after deleting '/foo/file.txt'
 * @returns {number}
 */
exports.Uploader.prototype.delete = function(/*serverUrl, itemPath, asDir*/) {};


// == DomTree ====
// =============================================================================
/**
 * @native
 * @constructor
 */
exports.DomTree = function() {};
/**
 * @native
 * @param {string} tagName
 * @param {Object?} props
 * @param {children?} children
 * @returns {number} A reference to the new element
 * @throws {TypeError}
 */
exports.DomTree.prototype.createElement = function(/*tagName, props, children*/) {};
/**
 * @native
 * @param {number} elemRef
 * @returns {string}
 * @throws {TypeError}
 */
exports.DomTree.prototype.render = function(/*elemRef*/) {};
/**
 * @native
 * @returns {{tagName: {string}, props: {Object}}[]} elements
 */
exports.DomTree.prototype.getRenderedElements = function() {};
/**
 * @native
 * @returns {{props: {Object}, fn: {Function}}[]} function components
 */
exports.DomTree.prototype.getRenderedFnComponents = function() {};


exports.log = print;