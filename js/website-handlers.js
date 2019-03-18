/**
 * == website-handlers.js ====
 *
 * This file implements handlers for GET /<page>, and * /api/websites/* http-routes.
 *
 */
var app = require('app.js').app;
var commons = require('common-services.js');
var website = require('website.js');
var http = require('http.js');
var diff = require('website-diff.js');
var uploadHandlerIsBusy = false;

exports.init = function() {
    app.addRoute(function(url, method) {
        if (method == 'GET' && url == '/api/websites')
            return handleGetAllWebsites;
        if (method == 'POST' && url == '/api/websites')
            return handleCreateWebsiteRequest;
        if (method == 'PUT' && url == '/api/websites/set-current')
            return handleSetCurrentWebsiteRequest;
        if (method == 'GET' && url == '/api/websites/sample-content-types')
            return handleGetAllSampleContentTypesRequest;
    });
    app.addRoute(function(url, method) {
        if (!app.currentWebsite)
            return rejectRequest;
        if (method == 'GET') {
            if (url == '/api/websites/current/num-waiting-uploads')
                return handleGetNumWaitingUploads;
            if (url == '/api/websites/current/templates')
                return handleGetAllTemplatesRequest;
            if (url == '/api/websites/current/waiting-uploads')
                return handleGetWaitingUploadsRequest;
            if (url == '/api/websites/current/site-graph')
                return handleGetSiteGraphRequest;
            return handlePageRequest;
        }
        if (method == 'POST') {
            if (url == '/api/websites/current/generate')
                return handleGenerateRequest;
            if (url == '/api/websites/current/upload') {
                if (!uploadHandlerIsBusy) return handleUploadRequest;
                else return rejectUploadRequest;
            }
        }
        if (method == 'PUT') {
            if (url == '/api/websites/current/page')
                return handleUpdatePageRequest;
            if (url == '/api/websites/current/site-graph')
                return handleUpdateSiteGraphRequest;
        }
    });
};

function rejectRequest() {
    return new http.Response(428, 'app.currentWebsite == null'); // Precondition Required
}

/**
 * GET <any> eg. "/" or "/foo/bar/baz": renders a page.
 */
function handlePageRequest(req) {
    var w = app.currentWebsite;
    var page = w.graph.getPage(req.url != '/' ? req.url : w.config.homeUrl);
    var dataToFrontend = {directiveElems: [], allContentNodes: [], page: {}};
    if (page) {
        var rescanType = req.getUrlParam('rescan');
        if (rescanType) {
            commons.signals.emit('siteGraphRescanRequested', rescanType);
        }
        var html = w.renderPage(page, dataToFrontend);
        dataToFrontend.page = {url: page.url, layoutFileName: page.layoutFileName};
        return new http.Response(200, injectControlPanelIFrame(html, dataToFrontend));
    } else {
        return new http.Response(404, injectControlPanelIFrame(
            '<!DOCTYPE html><html><title>Not found</title><body>Not found</body></htm>',
            dataToFrontend));
    }
}

/**
 * GET /api/websites/current/num-waiting-uploads.
 */
function handleGetNumWaitingUploads() {
    var count = 0;
    app.currentWebsite.db.select('select count(`url`) from uploadStatuses where \
                                 `uphash` is null or `curhash` != `uphash` or\
                                 `curhash` is null and `uphash` is not null',
        function(row) {
            count = row.getInt(0);
        });
    //
    return http.makeJsonResponse(200, count);
}

/**
 * GET /api/websites/current/template: lists all templates.
 *
 * Example response:
 * [
 *     {"fileName":"foo.jsx.htm"},
 *     {"fileName":"bar.jsx.htm"}
 * ]
 */
function handleGetAllTemplatesRequest() {
    var templates = [];
    var all = commons.templateCache._fns;
    for (var name in all) {
        if (name.indexOf('.htm') > -1) templates.push({fileName: name});
    }
    return http.makeJsonResponse(200, templates);
}

/**
 * GET /api/websites/current/waiting-uploads: Returns pages and files waiting
 * for an upload.
 *
 * Example response:
 * {
 *     "pages": [
 *         {"url":"/","uploadStatus":0},
 *         {"url":"/foo","uploadStatus":0}
 *     ],
 *     "files": [
 *         {"url:"theme.css","uploadStatus":0}
 *     ]
 * }
 */
function handleGetWaitingUploadsRequest() {
    var out = {pages: [], files: []};
    app.currentWebsite.db.select('select `url`, `curhash`, `uphash`, `isFile` \
        from uploadStatuses where `uphash` is null or `curhash` != `uphash` or\
        (`curhash` is null and `uphash` is not null)', function(row) {
        (row.getInt(3) == 0 ? out.pages : out.files).push({
            url: row.getString(0),
            uploadStatus: !row.getString(2) ? website.NOT_UPLOADED :
                            row.getString(1) ? website.OUTDATED : website.DELETED
        });
    });
    return http.makeJsonResponse(200, out);
}

/**
 * GET /api/websites/current/site-graph: Returns the contents of the site graph.
 *
 * Example response:
 * {
 *     "pages":[{"url":"/home"}]
 * }
 */
function handleGetSiteGraphRequest() {
    var out = {pages: []};
    for (var url in app.currentWebsite.graph.pages) {
        out.pages.push({url: url});
    }
    return http.makeJsonResponse(200, out);
}

/**
 * GET /api/websites: lists all websites installed on this machine.
 *
 * Example response:
 * [
 *     {"id":2,"dirPath":"d:/data/my-site/","name":"mysite.com","createdAt":1551939199},
 *     {"id":3,"dirPath":"c:/another/","name":null,"createdAt":1555438184}
 * ]
 */
function handleGetAllWebsites() {
    var out = [];
    app.db.select('select * from websites', function(row) {
        out.push({id: row.getInt(0), dirPath: row.getString(1),
            name: row.getString(2), createdAt: row.getInt(3)});
    });
    return http.makeJsonResponse(200, out);
}

/**
 * POST /api/websites: Creates a new website to $req.dirPath, populates it
 * with $req.sampleDataName data, and finally registers it to the global database.
 * Assumes that $req.dirPath already exists. Overwrites existing files (site.ini,
 * data.db).
 *
 * Payload:
 * {
 *     dirPath:        string; // required, example: "c:/foo/bar/"
 *     sampleDataName: string; // required, example: "minimal" or "blog"
 *     name?: string;          // maxLen 128, example "mysite.com"
 * }
 *
 * Example response:
 * {"status":"ok"}
 */
function handleCreateWebsiteRequest(req) {
    //
    var errs = [];
    if (!req.data.dirPath) errs.push('dirPath is required.');
    else { if (req.data.dirPath.charAt(req.data.dirPath.length - 1) != '/') req.data.dirPath += '/'; }
    if (!req.data.sampleDataName) errs.push('sampleDataName is required.');
    if (req.data.name && req.data.name.length > 128) errs.push('name.length must be <= 128');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    try {
        app.setWaitingWebsite(req.data.dirPath);
        app.waitingWebsite.install(req.data.sampleDataName);
        app.db.insert('insert or replace into websites (`dirPath`,`name`) \
                       values (?, ?)', function (stmt) {
            stmt.bindString(0, req.data.dirPath);
            stmt.bindString(1, req.data.name || null);
        });
        return http.makeJsonResponse(200, {status: 'ok'});
    } catch (e) {
        return http.makeJsonResponse(500, {status: 'err', details: e.message || '-'});
    }
}

/**
 * PUT /api/websites/set-current: Sets the website located at $req.dirPath as
 * the active website ($app.currentWebsite), and initializes it. If the requested
 * site was already the active one, does nothing.
 *
 * Payload:
 * {
 *     dirPath: string; // required, example: "c:/foo/bar/"
 * }
 *
 * Example response:
 * {"status":"ok"}
 */
function handleSetCurrentWebsiteRequest(req) {
    //
    var errs = [];
    if (!req.data.dirPath) errs.push('dirPath is required.');
    else { if (req.data.dirPath.charAt(req.data.dirPath.length - 1) != '/') req.data.dirPath += '/'; }
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    if (!app.currentWebsite ||
        app.currentWebsite.dirPath != req.data.dirPath) {
        try {
            app.setCurrentWebsite(req.data.dirPath);
        } catch (e) {
            return http.makeJsonResponse(500, {status: 'err', details: e.message || '-'});
        }
    }
    return http.makeJsonResponse(200, {status: 'ok'});
}

/**
 * GET /api/websites/sample-content-types: lists the default sample content types.
 *
 * Example response:
 * [
 *     {"name":"minimal","contentTypes":[
 *         {"name":"Generic","fields":[{"name":"content","dataType":"richtext"}]}
 *     ]},
 *     {"name":"blog","contentTypes":[
 *         {"name":"Generic","fields":[{"name":"content","dataType":"richtext"}]},
 *         {"name":"Article","fields":[{"name":"title","dataType":"text"},{"name":"body","dataType":"richtext"}]}
 *     ]}
 * ]
 */
function handleGetAllSampleContentTypesRequest() {
    return http.makeJsonResponse(200, app.getSampleContentTypes());
}

/**
 * GET /api/websites/current/generate: writes all pages to a local disk.
 *
 * Example response:
 * {
 *     "wrotePagesNum": 5,
 *     "tookSecs": 0.002672617,
 *     "totalPages": 6,
 *     "outPath": "/my/site/path/out",
 *     "issues": ["/some-url>Some error."]
 * }
 */
function handleGenerateRequest() {
    var w = app.currentWebsite;
    var out = {
        wrotePagesNum: 0,
        tookSecs: performance.now(),
        totalPages: w.graph.pageCount,
        outPath: w.dirPath + 'out',
        issues: []
    };
    w.generate(function(renderedOutput, page) {
        // 'path/out' + '/foo'
        var dirPath = out.outPath + page.url;
        if (w.fs.makeDirs(dirPath) &&
            w.fs.write(
                // 'path/out/foo' + '/index.html'
                dirPath + '/index.html',
                renderedOutput
            )) {
            out.wrotePagesNum += 1;
            return true;
        }
        return false;
    }, out.issues);
    out.tookSecs = (performance.now() - out.tookSecs) / 1000;
    return http.makeJsonResponse(200, out);
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

/**
 * PUT /api/websites/current/page: updates app.currentWebsite.graph.pages[$req.data.url].
 *
 * Payload:
 * {
 *     url: string;            // required
 *     layoutFileName: string; // required
 * }
 *
 * Example response:
 * {"numAffectedRows": 1}
 */
function handleUpdatePageRequest(req) {
    var errs = [];
    if (req.data.url) {
        var page = app.currentWebsite.graph.getPage(req.data.url);
        if (!page) errs.push('Page' + req.data.url + ' not found.');
    } else {
        errs.push('url is required.');
    }
    if (!req.data.layoutFileName) errs.push('layoutFileName is required.');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    page.layoutFileName = req.data.layoutFileName;
    var ok = app.currentWebsite.saveToDb(app.currentWebsite.graph);
    return http.makeJsonResponse(200, {numAffectedRows: ok});
}

/**
 * PUT /api/websites/current/site-graph: deletes the requested pages from the
 * site graph, and syncs the changes to the database.
 *
 * Payload:
 * {
 *     deleted: string[]; // required
 * }
 *
 * Example response:
 * {"status":"ok"}
 */
function handleUpdateSiteGraphRequest(req) {
    var remoteDiff = new diff.RemoteDiff();
    var w = app.currentWebsite;
    for (var i = 0; i < req.data.deleted.length; ++i) {
        var url = req.data.deleted[i];
        if (!w.graph.getPage(url)) {
            return new http.Response(400, 'Page \'' + url + '\' not found.');
        }
        remoteDiff.addPageToDelete(url);
        delete w.graph.pages[url];
    }
    if (i == 0) return new http.Response(400, 'Nothing to update.');
    //
    w.saveToDb(w.graph); // update websites set `graph` = ...
    remoteDiff.saveStatusesToDb(); // update|delete from uploadStatuses ...
    return http.makeJsonResponse(200, {status: 'ok'});
}

/**
 * @param {string} html <html>...<p>foo</p></body>...
 * @param {Object} dataToFrontend {
 *     page: {url: <str>, layoutFileName: <str>},
 *     directiveElems: [{uiPanelType: <str>, contentType: <str>, contentNodes: [<cnode>...]...}...],
 *     allContentNodes: [{..., defaults: {id: <id>, name: <name>...}}],
 * }
 * @returns {string} <html>...<p>foo</p><iframe...</body>...
 */
function injectControlPanelIFrame(html, dataToFrontend) {
    var bodyEnd = html.indexOf('</body>');
    if (bodyEnd > -1) {
        return html.substr(0, bodyEnd) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' + JSON.stringify(dataToFrontend) + ';}</script>' + html.substr(bodyEnd);
    }
    return html;
}

exports.rejectRequest = rejectRequest;