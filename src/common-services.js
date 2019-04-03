/**
 * # common-services.js
 *
 * In this file:
 *
 * ## signals: singleton
 * ## fileWatcher: singleton
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

exports.signals = signals;
exports.fileWatcher = fileWatcher;
