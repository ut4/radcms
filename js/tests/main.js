var app = require('app.js').app;
app.initAndInstall(':memory:');
require('directives.js').init();
var commons = require('common-services.js');
var fileWatchers = require('file-watchers.js');

commons.log = function() {};

commons.templateCache.clear = function() {
    for (var key in commons.templateCache._fns) {
        if (key.indexOf('Rad') != 0) commons.templateCache.remove(key);
    }
};

fileWatchers.clear = function() {
    commons.fileWatcher._watchFn = null;
    commons.signals._listeners = [];
};

