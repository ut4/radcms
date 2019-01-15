var commons = require('common-services.js');
var fileWatcher = commons.fileWatcher;

/**
 * Receives all file events.
 *
 * @param {number} type commons.fileWatcher.EventAdded|Modified etc.
 * @param {string} fileName
 */
function handleFWEvent(type, fileName) {
    if (type == fileWatcher.EventModified) {
        handleFileModifyEvent(fileName);
    }
}

/**
 * @param {string} fileName
 */
function handleFileModifyEvent(fileName) {
    console.log('Got', fileName);
}

exports.init = function() {
    fileWatcher.setWatchFn(handleFWEvent);
};