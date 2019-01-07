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
    insert: function(sql, bindFn) {}
};


// == fs-singleton ====
// =============================================================================
exports.fs = {
    /** @native */
    write: function(path, str) { console.log('Writing ' + str + '...'); return true; },
    /** @native */
    read: function(path) {},
    /** @native */
    makeDirs: function(path) { console.log('Creating dirs ' + path + '...'); return true; },
};


// == transpiler-singleton ====
// =============================================================================
exports.transpiler = {
    /** @native */
    transpile: function(code) {}
};


// == fileWatcher-singleton ====
// =============================================================================
exports.fileWatcher = {
    /** @native */
    watch: function(dir, fn) {}
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
    put: function(fname, fn) {},
    get: function(fname) {
        if (fname == 'main-layout.jsx.htm') return function(ddc, url) {
            var arts = ddc.fetchAll('Article');
            return function(domTree) {
                arts = ddc.getDataFor(arts);
                return domTree.createElement('html', null, [
                    domTree.createElement('title', null, 'Hello'),
                    domTree.createElement('body', null, arts.map(function(art) {
                        return domTree.createElement('article', null, [
                            domTree.createElement('h2', null, art.title),
                            domTree.createElement('a', {href:art.cmp.name,
                                layoutFileName:'article-layout.jsx.htm'}, "Read more"),
                        ])
                    }))
                ]);
            };
        };
        if (fname == 'article-layout.jsx.htm') return function(ddc, url) {
            var art = ddc.fetchOne('Article').where('name=\'' + url + '\'');
            return function(domTree) {
                art = ddc.getDataFor(art);
                return domTree.createElement('html', null, [
                    domTree.createElement('title', null, 'Hello'),
                    domTree.createElement('body', null, 'Art'+url)
                ]);
            };
        };
    }
};