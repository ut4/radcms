/**
 * # common-services.js
 *
 * In this file:
 *
 * ## templateCache
 * ## signals
 *
 */

exports.templateCache = {
    _fns: {},
    put(fname, fn, doWhine) {
        if (doWhine && this._fns.hasOwnProperty(fname)) {
            throw new Error('Duplicate template "' + fname + '"');
        }
        this._fns[fname] = fn;
        this._fns[fname.split('.')[0]] = this._fns[fname];
    },
    remove(fname) {
        delete this._fns[fname];
        delete this._fns[fname.split('.')[0]];
    },
    get(name) {
        return this._fns[name];
    },
    has(name) {
        return this._fns.hasOwnProperty(name);
    }
};

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
        let l = this._listeners.length;
        for (let i = 0; i < l; ++i) {
            let listener = this._listeners[i];
            if (listener.listeningTo == whichSignal &&
                listener.fn(arg) === false) break;
        }
    }
};
