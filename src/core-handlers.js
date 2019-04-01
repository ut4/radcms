/**
 * # core-handlers.js
 *
 * This file contains a handler for static file requests (GET /<any>.<fileExt>).
 *
 */
const fs = require('fs');
const path = require('path');
const {webApp, BasicResponse} = require('./web.js');
const {app} = require('./app.js');

exports.init = () => {
    webApp.addRoute((url, method) => {
        if (method === 'GET' && url.lastIndexOf('.') > -1)
            return handleStaticFileRequest;
    });
};

function handleStaticFileRequest(req, then) {
    let filePath = '';
    if (req.url.indexOf('/frontend/') === 0) {
        filePath = path.join(__dirname, '..' + req.url);
    } else if (app.currentWebsite) {
        filePath = app.currentWebsite.dirPath + req.url.substr(1);
    }
    fs.readFile(filePath, 'binary', (err, file) => {
        if (err) {
            then(new BasicResponse(404, '404', {'Content-Type': 'text/plain'}));
            return;
        }
        const mime = getMime(req.url.substr(req.url.lastIndexOf('.') + 1));
        then(new BasicResponse(200, [file, 'binary'], mime ? {'Content-Type': mime} : null));
    });
}

////////////////////////////////////////////////////////////////////////////////

function getMime(ext) {
    return {
        'js':         'application/javascript',
        'htm':        'text/html',
        'html':       'text/html',
        'css':        'text/css',
        'png':        'image/png',
        'jpg':        'image/jpeg',
        'jpeg':       'image/jpeg',
        'svg':        'image/svg+xml',
        'gif':        'image/gif',
        'tiff':       'image/tiff',
        'tif':        'image/tiff',
        'bmp':        'image/bmp',
        'woff2':      'font/woff2',
        'woff':       'font/woff',
        'ttf':        'font/truetype',
        'otf':        'font/opentype',
    }[ext] || null;
}
