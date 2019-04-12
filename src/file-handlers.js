/**
 * # file-handlers.js
 *
 * This file contains http-handlers for * /api/file/*.
 *
 */
const fs = require('fs');
const {app} = require('./app.js');
const {webApp} = require('./web.js');
const {Dirent} = require('./pkg-monkeypatches.js');

exports.init = () => {
    webApp.addRoute((url, method) => {
        if (method === 'POST' && url === '/api/file/list-dir')
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
function handleListDirRequest(req, res) {
    //
    const errs = [];
    if (!req.data.path) errs.push('path is required.');
    else { if (req.data.path.charAt(req.data.path.length - 1) != '/') req.data.path += '/'; }
    if (errs.length) { res.plain(400, errs.join('\n')); return; }
    //
    const out = {
        root: req.data.path != '$HOME/' ? req.data.path : app.homePath,
        entries: []
    };
    fs.readdir(out.root, {withFileTypes: true}, (err, files) => {
        files = !err ? files : [];
        for (let entry of files) {
            if (typeof entry === 'string') entry = new Dirent(entry.name, out.root);
            if (entry.isDirectory()) out.entries.push({name: entry.name, isDir: true});
        }
        res.json(200, out);
    });
}