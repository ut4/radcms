// == app-singleton ====
// =============================================================================
exports.app = {
    _routeMatchers: [],
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


// == db-singleton ====
// =============================================================================
exports.db = {
    /**
     * @native
     * @param {string} sql
     * @param {(stmt: Stmt): void} bindFn
     * @returns int lastInsertId
     */
    insert: function(/*sql, bindFn*/) {},
    /**
     * @native
     * @param {string} sql
     * @param {(row: ResultRow, rowIdx: number): void} mapFn
     */
    select: function(/*sql, mapFn*/) {},
    /**
     * @native
     * @param {string} sql
     * @param {(stmt: Stmt): void} bindFn
     * @returns int numAffectedRows
     */
    update: function(/*sql, bindFn*/) {},
    /**
     * @see update
     */
    delete: function(/*sql, bindFn*/) {},
};


// == fs-singleton ====
// =============================================================================
exports.fs = {
    /**
     * @native
     * @param {string} path
     * @param {string} contents
     * @returns {bool}
     * @throws {Error}
     */
    write: function(/*path, contents*/) {},
    /**
     * @native
     * @param {string} path
     * @returns {str}
     */
    read: function(/*path*/) {},
    /**
     * @native
     * @param {string} path
     * @returns {bool}
     */
    makeDirs: function(/*path*/) {},
};


// == signals-singleton ====
// =============================================================================
exports.signals = {
    _listeners: [],
    /**
     * @param {string} whichSignal
     * @param {function} fn
     */
    listen: function(whichSignal, fn) {
        this._listeners.push({listeningTo: whichSignal, fn: fn});
    },
    /**
     * @param {string} whichSignal
     * @param {any?} arg
     */
    emit: function(whichSignal, arg) {
        var l = this._listeners.length;
        for (var i = 0; i < l; ++i) {
            var listener = this._listeners[i];
            if (listener.listeningTo == whichSignal &&
                listener.fn(arg) === false) break;
        }
    }
};


// == transpiler-singleton ====
// =============================================================================
exports.transpiler = {
    /**
     * @native
     * @param {string} code
     * @param {string} fileName For debugging
     * @returns {Function}
     * @throws {Error}
     */
    transpileToFn: function(/*code, fileName*/) {}
};


// == fileWatcher-singleton ====
// =============================================================================
exports.fileWatcher = {
    EVENT_NOTICE_WRITE: 0,
    EVENT_NOTICE_REMOVE: 1,
    EVENT_CREATE: 2,
    EVENT_WRITE: 3,
    EVENT_CHMOD: 4,
    EVENT_REMOVE: 5,
    EVENT_RENAME: 6,
    EVENT_RESCAN: 7,
    EVENT_ERROR: 8,
    _watchFn: null,
    /**
     * @param ((eventType: number, fileName: string): void) fn
     */
    setWatchFn: function(fn) {
        if (typeof fn != 'function') {
            throw new TypeError('watchFn must be a function.');
        }
        this._watchFn = fn;
    }
};


// == Uploader ====
// =============================================================================
/**
 * @native
 * @param {string} username
 * @param {string} password
 * @constructor
 */
exports.Uploader = function(/*username, password*/) {};
exports.Uploader.UPLOAD_OK = 0;
exports.Uploader.UPLOAD_LOGIN_DENIED = 1;
/**
 * @native
 * @param {url} eg. 'ftp://ftp.mysite.net/public_html/file.html'
 * @param {contents}
 * @returns {number} eg. Uploader.UPLOAD_*
 */
exports.Uploader.prototype.upload = function(/*url, contents*/) {};


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


// == templateCache-singleton ====
// =============================================================================
exports.templateCache = {
    _fns: {},
    put: function(key, fn) {
        this._fns[key] = fn;
    },
    get: function(key) {
        return this._fns[key];
    },
    has: function(key) {
        return this._fns.hasOwnProperty(key);
    },
    remove: function(key) {
        delete this._fns[key];
    }
};