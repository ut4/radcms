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

exports.db = {
    /** @native */
    insert: function(sql, bindFn) {}
};

exports.fs = {
    /** @native */
    write: function(path, str) {},
    /** @native */
    read: function(path) {}
};

exports.transpiler = {
    /** @native */
    transpile: function(code) {}
};

exports.fileWatcher = {
    /** @native */
    watch: function(dir, fn) {}
};

exports.templateCache = {
    putFn: function(fname, fn) {},
    getFn: function(fname) {}
};