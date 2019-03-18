/**
 * == file-handlers.js ====
 *
 * This file implements handlers for /api/file/* http-routes.
 *
 */
var app = require('app.js').app;
var commons = require('common-services.js');
var http = require('http.js');

exports.init = function() {
    app.addRoute(function(url, method) {
        if (method == 'POST' && url == '/api/file/list-dir')
            return handleListDirRequest;
    });
};

/**
 * POST /api/file/list-dir.
 *
 * Example response:
 * {
 *     "root: "c:/my-projects/",
 *     "entries: [
 *         {"name":"foo","isDir":true},
 *         {"name":"bar","isDir":true}
 *     ]
 * }
 */
function handleListDirRequest(req) {
    //
    var errs = [];
    if (!req.data.path) errs.push('path is required.');
    else { if (req.data.path.charAt(req.data.path.length - 1) != '/') req.data.path += '/'; }
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    var out = {
        root: req.data.path != '$HOME/' ? req.data.path : insnEnv.homePath,
        entries: []
    };
    commons.fs.readDir(out.root, function(entry) {
        if (entry.isDir) out.entries.push(entry);
    });
    return http.makeJsonResponse(200, out);
}