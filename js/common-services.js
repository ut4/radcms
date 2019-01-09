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
     * @returns int sqlite3_last_insert_rowid()
     */
    insert: function(sql, bindFn) {},
    /**
     * @native
     * @param {string} sql
     * @param {(row: ResultRow, nthRow: number): void} mapFn
     */
    select: function(sql, mapFn) {}
};


// == fs-singleton ====
// =============================================================================
exports.fs = {
    /** @native */
    write: function(path, str) {},
    /**
     * @native
     * @param {string} path
     * @returns {str}
     */
    read: function(path) {},
    /** @native */
    makeDirs: function(path) {},
};


// == transpiler-singleton ====
// =============================================================================
exports.transpiler = {
    /**
     * @native
     * @param {string} code
     * @returns {Function}
     * @throws {Error}
     */
    transpileToFn: function(code) {}
};


// == fileWatcher-singleton ====
// =============================================================================
exports.fileWatcher = {
    /** @native */
    watch: function(dir, fn) {}
};


// == Uploader ====
// =============================================================================
exports.Uploader = function() {};
exports.Uploader.UPLOAD_LOGIN_DENIED = 1;
/** @native */
exports.Uploader.prototype.upload = function(filePath, contents) {
    console.log('Uploading ' + contents + '...');
    return 0;
};


// == DomTree ====
// =============================================================================
/** @constructor */
exports.DomTree = function() {}
/**
 * @native
 * @param {string} tagName
 * @param {Object?} props
 * @param {children?} children
 * @returns {number} A reference to the new element
 * @throws {TypeError}
 */
exports.DomTree.prototype.createElement = function(tagName, props, children) {};
/**
 * @native
 * @param {number} elemRef
 * @returns {string}
 * @throws {TypeError}
 */
exports.DomTree.prototype.render = function(elemRef) {};

// == templateCache-singleton ====
// =============================================================================
exports.templateCache = {
    _fns: [],
    put: function(fname, fn) {
        this._fns[fname] = fn;
    },
    get: function(fname) {
        return this._fns[fname];
    }
};