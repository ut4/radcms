var commons = require('common-services.js');
var website = require('website.js');
var http = require('http.js');
var uploadHandlerIsBusy = false;

commons.app.addRoute(function(url, method) {
    if (method == 'GET') {
        if (url == '/api/website/num-pending-changes')
            return handleGetNumPendingChanges;
        if (url == '/api/website/templates')
            return handleGetAllTemplatesRequest;
        if (url == '/api/website/upload-statuses')
            return handleGetUploadStatusesRequest;
        return handlePageRequest;
    }
    if (method == 'POST') {
        if (url == '/api/website/generate')
            return handleGenerateRequest;
        if (url == '/api/website/upload') {
            if (!uploadHandlerIsBusy) return handleUploadRequest;
            else return rejectUploadRequest;
        }
    }
    if (method == 'PUT' && url == '/api/website/page')
        return handleUpdatePageRequest;
});

/**
 * GET <any> eg. "/" or "/foo/bar/baz": renders a page.
 */
function handlePageRequest(req) {
    var page = website.siteGraph.getPage(req.url != '/' ? req.url : website.siteConfig.homeUrl);
    var dataToFrontend = {directiveInstances: [], allContentNodes: [], page: {}};
    if (page) {
        var rescanType = req.getUrlParam('rescan');
        if (rescanType) {
            commons.signals.emit('sitegraphRescanRequested', rescanType);
        }
        var html = page.render(dataToFrontend);
        dataToFrontend.page = {url: page.url, layoutFileName: page.layoutFileName};
        return new http.Response(200, injectControlPanelIFrame(html, dataToFrontend));
    } else {
        return new http.Response(404, injectControlPanelIFrame(
            '<!DOCTYPE html><html><title>Not found</title><body>Not found</body></htm>',
            dataToFrontend));
    }
}

/**
 * GET /api/website/upload-statuses: Returns all pages and files, and their
 * upload statuses.
 *
 * Example response:
 * {
 *     "pages": [
 *         {"url":"/","layoutFileName":"foo.jsx.htm","uploadStatus":0},
 *         {"url":"/foo","layoutFileName":"foo.jsx.htm","uploadStatus":0}
 *     ],
 *     "files": [
 *         {"url:"theme.css","uploadStatus":0}
 *     ]
 * }
 */
function handleGetUploadStatusesRequest() {
    var out = {pages: [], files: []};
    var statuses = {};
    commons.db.select('select `url`,`curhash`,`uphash` from uploadStatuses', function(row) {
        var status = 0;
        var local = row.getString(1);
        var up = row.getString(2);
        if (local && up) status = local == up ? website.UPLOADED : website.OUTDATED;
        statuses[row.getString(0)] = status;
    });
    commons.db.select('select `url` from staticFileResources', function(row) {
        var url = row.getString(0);
        out.files.push({url: url, uploadStatus: statuses[url] ?
            statuses[url] : website.NOT_UPLOADED});
    });
    //
    for (var url in website.siteGraph.pages) {
        var page = website.siteGraph.pages[url];
        page.uploadStatus = statuses[url] ? statuses[url] : website.NOT_UPLOADED;
        out.pages.push(page);
    }
    return new http.Response(200, JSON.stringify(out),
        {'Content-Type': 'application/json'}
    );
}

/**
 * GET /api/website/template: lists all templates.
 *
 * Example response:
 * [
 *     {"fileName":"foo.jsx.htm", "isOk": true, "isInUse": true},
 *     {"fileName":"bar.jsx.htm", "isOk": false, "isInUse": true}
 * ]
 */
function handleGetAllTemplatesRequest() {
    var templates = [];
    var all = website.siteGraph.templates;
    for (var fileName in all)
        templates.push({fileName: fileName, isOk: all[fileName].isOk,
                        isInUse: all[fileName].isInUse});
    return new http.Response(200, JSON.stringify(templates),
        {'Content-Type': 'application/json'}
    );
}

/**
 * GET /api/website/generate: writes all pages to disk.
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
    var out = {
        wrotePagesNum: 0,
        tookSecs: performance.now(),
        totalPages: website.siteGraph.pageCount,
        outPath: insnEnv.sitePath + 'out',
        issues: []
    };
    out.wrotePagesNum = website.website.generate(function(renderedOutput, page) {
        // 'path/out' + '/foo'
        var dirPath = out.outPath + page.url;
        return website.website.fs.makeDirs(dirPath) &&
                website.website.fs.write(
                    // 'path/out/foo' + '/index.html'
                    dirPath + '/index.html',
                    renderedOutput
                );
    }, out.issues);
    out.tookSecs = (performance.now() - out.tookSecs) / 1000;
    return new http.Response(200, JSON.stringify(out),
        {'Content-Type': 'application/json'}
    );
}

/**
 * POST /api/website/upload: renders all pages, and uploads them to a server
 * using FTP.
 *
 * Payload:
 * remoteUrl=str|required&
 * username=str|required&
 * password=str|required&
 * fileNames[0-n]=str
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
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    uploadHandlerIsBusy = true;
    var generated = [];
    var issues = [];
    website.website.generate(function(renderedOutput, page) {
        generated.push({url: page.url, html: renderedOutput});
        return true;
    }, issues);
    if (issues.length) {
        uploadHandlerIsBusy = false;
        return new http.Response(400, issues.join('\n'));
    }
    //
    return new http.ChunkedResponse(200, function getNewChunk(state) {
        var resourceTypePrefix, url, contents, uploadRes;
        // Previous upload had a problem -> abort
        if (state.hadStopError) {
            uploadHandlerIsBusy = false;
            throw new Error('...');
        }
        // Upload the files first
        var idx = state.nthItem - 1;
        if (idx < state.totalIncomingFiles) {
            resourceTypePrefix = 'file|';
            url = state.fileNames[idx];
            contents = website.website.fs.read(insnEnv.sitePath + url);
            uploadRes = state.uploader.uploadString(state.remoteUrl + url,
                contents);
            // Was last
            if (state.nthItem === state.totalIncomingFiles) {
                state.totalIncomingFiles = -1;
                state.nthItem = 0;
            }
        // Files ok, check if there's pages
        } else {
            if (idx < state.totalIncomingPages) {
                resourceTypePrefix = 'page|';
                var curPage = state.generatedPages[idx];
                url = curPage.url;
                contents = curPage.html;
                uploadRes = state.uploader.uploadString(state.remoteUrl +
                    url + '/index.html', contents);
            } else {
                // We're done
                uploadHandlerIsBusy = false;
                return '';
            }
        }
        state.hadStopError = uploadRes == commons.UploaderStatus.UPLOAD_LOGIN_DENIED;
        if (!state.hadStopError) saveUploadStatus(url, contents);
        state.nthItem += 1;
        return resourceTypePrefix + url + '|' + uploadRes;
    }, makeUploadState(req.data, generated));
}

function saveUploadStatus(url, contents) {
    var sql = 'update uploadStatuses set `uphash` = ? where `url` = ?';
    if (commons.db.update(sql, function(stmt) {
        stmt.bindString(0, website.website.crypto.sha1(contents));
        stmt.bindString(1, url);
    }) < 0) {
        commons.log('[Error]: Failed to save uploadStatus of \'' + url + '\'.');
    }
}

function rejectUploadRequest() {
    return new http.Response(409, 'The upload process has already started.');
}

function makeUploadState(reqData, generatedHtmls) {
    var l = reqData.remoteUrl.length - 1;
    var state = {
        nthItem: 1,
        totalIncomingPages: generatedHtmls.length,
        generatedPages: generatedHtmls,
        remoteUrl: reqData.remoteUrl.charAt(l) != '/'
            ? reqData.remoteUrl : reqData.remoteUrl.substr(0, l),
        uploader: new website.website.Uploader(reqData.username, reqData.password),
        fileNames: [],
        totalIncomingFiles: 0,
        hadStopError: false
    };
    var fname;
    while ((fname = reqData['fileNames[' + state.totalIncomingFiles + ']'])) {
        state.fileNames.push(fname);
        state.totalIncomingFiles += 1;
    }
    return state;
}

/**
 * GET /api/website/num-pending-changes.
 */
function handleGetNumPendingChanges() {
    var count = 0;
    commons.db.select('select count(`url`) from uploadStatuses where \
                       `uphash` is null or `curhash` != `uphash`',
        function(row) {
            count = row.getInt(0).toString();
        });
    //
    return new http.Response(200, count, {'Content-Type': 'application/json'});
}

/**
 * PUT /api/website/page: updates siteGraph.pages[$req.data.url].
 *
 * Payload:
 * url=string|required&
 * layoutFileName=string|required
 *
 * Example response:
 * {"numAffectedRows": 1}
 */
function handleUpdatePageRequest(req) {
    var errs = [];
    if (req.data.url) {
        var page = website.siteGraph.getPage(req.data.url);
        if (!page) errs.push('Page' + req.data.url + ' not found.');
    } else {
        errs.push('url is required.');
    }
    if (!req.data.layoutFileName) errs.push('layoutFileName is required.');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    page.layoutFileName = req.data.layoutFileName;
    setLayoutAsUsed(page.layoutFileName);
    var ok = commons.db.update('update websites set `graph` = ?', function(stmt) {
        stmt.bindString(0, website.siteGraph.serialize());
    });
    return new http.Response(200, JSON.stringify({numAffectedRows: ok}),
        {'Content-Type': 'application/json'});
}

function setLayoutAsUsed(fileName) {
    var t = website.siteGraph.getTemplate(fileName);
    t.isInUse = true;
    if (!t.isOk) {
        try { t.isOk = website.website.compileAndCacheTemplate(t.fileName); }
        catch(e) { t.isOk = false; }
    }
}

/**
 * @param {string} html <html>...<p>foo</p></body>...
 * @param {Object} dataToFrontend {
 *     page: {url: <str>, layoutFileName: <str>},
 *     directiveInstances: [{type: <str>, contentNodes: [<cnode>...]...}...],
 *     allContentNodes: [{..., defaults: {id: <id>, name: <name>...}}],
 * }
 * @returns {string} <html>...<p>foo</p><iframe...</body>...
 */
function injectControlPanelIFrame(html, dataToFrontend) {
    var bodyEnd = html.indexOf('</body>');
    if (bodyEnd > -1) {
        return html.substr(0, bodyEnd) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:220px;right:4px;top:4px;"></iframe><script>function setIframeVisible(setVisible) { document.getElementById(\'insn-cpanel-iframe\').style.width = setVisible ? \'80%\' : \'200px\'; } function getCurrentPageData() { return ' + JSON.stringify(dataToFrontend) + '; }</script>' + html.substr(bodyEnd);
    }
    return html;
}