/**
 * == website-handlers.js ====
 *
 * This file implements handlers for GET /<page>, and * /api/websites/* http-routes.
 *
 */
var app = require('app.js').app;
var commons = require('common-services.js');
var http = require('http.js');
var diff = require('website-diff.js');
var uploadHandlerIsBusy = false;

exports.init = function() {
    app.addRoute(function(url, method) {
        if (!app.currentWebsite)
            return rejectRequest;
        if (method == 'POST') {
            if (url == '/api/websites/current/upload') {
                if (!uploadHandlerIsBusy) return handleUploadRequest;
                else return rejectUploadRequest;
            }
        }
    });
};

function rejectRequest() {
    return new http.Response(428, 'app.currentWebsite == null'); // Precondition Required
}

/**
 * POST /api/websites/current/upload: uploads or deletes the requested pages and
 * files to/from a remote server using FTP.
 *
 * Payload:
 * {
 *     remoteUrl: string; // required
 *     username: string;  // required
 *     password: string;  // required
 *     pageUrls: {        // required if fileNames.length == 0
 *         url: string;
 *         isDeleted: number;
 *     }[];
 *     fileNames: {       // required if pageUrls.length == 0
 *         fileName: string;
 *         isDeleted: number;
 *     }[];
 * }
 *
 * Example response chunk:
 * file|/some-file.css|0
 * - or -
 * page|/some/url|0
 */
function handleUploadRequest(req) {
    //
    var errs = [];
    if (!req.data.remoteUrl) errs.push('remoteUrl is required.');
    if (!req.data.username) errs.push('username is required.');
    if (!req.data.password) errs.push('password is required.');
    if ((!req.data.pageUrls || !req.data.pageUrls.length) &&
        (!req.data.fileNames || !req.data.fileNames.length)) {
        errs.push('pageUrls or fileNames is required.');
    }
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    var pageUrls = {};
    var uploadState = makeUploadState(req.data, pageUrls);
    uploadHandlerIsBusy = true;
    var issues = [];
    // Render all pages in one go so we can return immediately if there was any issues
    if (uploadState.uploadPagesLeft) {
        if (!app.currentWebsite.generate(function(renderedOutput, page) {
            uploadState.generatedPages.push({url: page.url, html: renderedOutput});
        }, issues, pageUrls)) {
            uploadHandlerIsBusy = false;
            return new http.Response(400, issues.join('\n'));
        }
    }
    //
    return new http.ChunkedResponse(200, function getNewChunk(state) {
        var resourceTypePrefix, url, contents, uploadRes;
        // Previous upload had a problem -> abort
        if (state.hadStopError) {
            uploadHandlerIsBusy = false;
            throw new Error('...');
        }
        var idx = state.nthItem - 1;
        // Delete removed pages first ...
        if (state.deletablePagesLeft > 0) {
            url = state.deletablePageUrls[idx];
            uploadRes = state.uploader.delete(state.remoteUrl,
                url + '/index.html', true);
            if (--state.deletablePagesLeft == 0) state.nthItem = 0;
        // Then removed files ...
        } else if (state.deletableFilesLeft > 0) {
            resourceTypePrefix = 'file|';
            url = state.deletableFileNames[idx];
            uploadRes = state.uploader.delete(state.remoteUrl, url, false);
            if (--state.deletableFilesLeft == 0) state.nthItem = 0;
        // Then upload new files ...
        } else if (state.uploadFilesLeft > 0) {
            resourceTypePrefix = 'file|';
            url = state.uploadFileNames[idx];
            contents = app.currentWebsite.fs.read(app.currentWebsite.dirPath + url);
            uploadRes = state.uploader.uploadString(state.remoteUrl + url,
                contents);
            if (--state.uploadFilesLeft == 0) state.nthItem = 0;
        // And lastly upload new or modified pages
        } else if (state.uploadPagesLeft > 0) {
            var curPage = state.generatedPages[idx];
            url = curPage.url;
            contents = curPage.html;
            uploadRes = state.uploader.uploadString(state.remoteUrl +
                url + '/index.html', contents);
            state.uploadPagesLeft -= 1;
        // We're done
        } else {
            uploadHandlerIsBusy = false;
            return '';
        }
        state.hadStopError = uploadRes == commons.UploaderStatus.UPLOAD_LOGIN_DENIED;
        if (!state.hadStopError) saveOrDeleteUploadStatus(url, contents);
        state.nthItem += 1;
        return (resourceTypePrefix || 'page|') + url + '|' + uploadRes;
    }, uploadState);
}

function saveOrDeleteUploadStatus(url, contents) {
    if (contents) {
        var sql = 'update uploadStatuses set `uphash` = ? where `url` = ?';
        if (app.currentWebsite.db.update(sql, function(stmt) {
            stmt.bindString(0, app.currentWebsite.crypto.sha1(contents));
            stmt.bindString(1, url);
        }) < 0) {
            commons.log('[Error]: Failed to save uploadStatus of \'' + url + '\'.');
        }
    } else {
        sql = 'delete from uploadStatuses where `url` = ?';
        if (app.currentWebsite.db.delete(sql, function(stmt) { stmt.bindString(0, url); }) < 0) {
            commons.log('[Error]: Failed to delete \'' + url + '\' from uploadStatuses.');
        }
    }
}

function rejectUploadRequest() {
    return new http.Response(409, 'The upload process has already started.');
}

function makeUploadState(reqData, pageUrls) {
    var l = reqData.remoteUrl.length - 1;
    var state = {
        nthItem: 1,
        deletablePageUrls: [], deletablePagesLeft: 0,
        deletableFileNames: [], deletableFilesLeft: 0,
        generatedPages: [], uploadPagesLeft: 0,
        uploadFileNames: [], uploadFilesLeft: 0,
        remoteUrl: reqData.remoteUrl.charAt(l) != '/'
            ? reqData.remoteUrl : reqData.remoteUrl.substr(0, l),
        uploader: new app.currentWebsite.Uploader(reqData.username, reqData.password),
        hadStopError: false
    };
    for (var i = 0; i < reqData.fileNames.length; ++i) {
        var file = reqData.fileNames[i];
        if (file.isDeleted == 0) {
            state.uploadFileNames.push(file.fileName);
            state.uploadFilesLeft += 1;
        } else {
            state.deletableFileNames.push(file.fileName);
            state.deletableFilesLeft += 1;
        }
    }
    for (i = 0; i < reqData.pageUrls.length; ++i) {
        var page = reqData.pageUrls[i];
        if (page.isDeleted == 0) {
            pageUrls[page.url] = 1;
            state.uploadPagesLeft += 1;
        } else {
            state.deletablePageUrls.push(page.url);
            state.deletablePagesLeft += 1;
        }
    }
    return state;
}

exports.rejectRequest = rejectRequest;