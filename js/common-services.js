/**
 * == common-services.js ====
 *
 * In this file:
 *
 * - fileWatcher (singleton)
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
