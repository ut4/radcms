/**
 * # core-handlers.js
 *
 * This file contains an http-handler for static file requests (GET /<any>.<fileExt>).
 *
 */
const fs = require('fs');
const path = require('path');
const {webApp} = require('./web.js');
const {app} = require('./app.js');

exports.init = () => {
    webApp.addRoute((url, method) => {
        if (method === 'GET' && url.lastIndexOf('.') > -1)
            return handleStaticFileRequest;
    });
};

function handleStaticFileRequest(req, res) {
    let filePath = '';
    const headers = {};
    if (req.path.indexOf('/frontend/') === 0) {
        filePath = path.join(__dirname, '..' + req.path);
        headers['Cache-Control'] = 'public,max-age=86400'; // 24h
    } else if (app.currentWebsite) {
        filePath = app.currentWebsite.dirPath + req.path.substr(1);
    }
    fs.readFile(filePath, 'binary', (err, file) => {
        if (err) {
            res.plain(404, '404');
            return;
        }
        const mime = getMime(req.path.substr(req.path.lastIndexOf('.') + 1));
        if (mime) headers['Content-Type'] = mime;
        res.send(200, [file, 'binary'], headers);
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
