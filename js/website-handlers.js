var commons = require('common-services.js');
var website = require('website.js');
var http = require('http.js');
var uploadHandlerIsBusy = false;

commons.app.addRoute(function(url, method) {
    if (method == 'GET' && url == '/api/website/pages')
        return handleGetPagesRequest;
    if (method == 'POST' && url == '/api/website/generate')
        return handleGenerateRequest;
    if (method == 'POST' && url == '/api/website/upload') {
        if (!uploadHandlerIsBusy) return handleUploadRequest;
        else return rejectUploadRequest;
    }
    if (method == 'GET' && url == '/api/website/num-pending-changes')
        return handleGetNumPendingChanges;
    if (method == 'GET')
        return handlePageRequest;
});

/**
 * GET /api/website/pages: lists all pages.
 *
 * Example response:
 * [
 *     {"url":"/","layoutFileName":"foo.jsx.htm","uploadStatus":0},
 *     {"url":"/foo","layoutFileName":"foo.jsx.htm","uploadStatus":0}
 * ]
 */
function handleGetPagesRequest() {
    var statuses = {};
    commons.db.select('select `url`, `status` from uploadStatuses', function(row) {
        statuses[row.getString(0)] = row.getInt(1);
    });
    //
    var out = [];
    for (var url in website.siteGraph.pages) {
        var page = website.siteGraph.pages[url];
        page.uploadStatus = statuses[url] ? statuses[url].uploadStatus : 0;
        out.push(page);
    }
    return new http.Response(200, JSON.stringify(out),
        {'Content-Type': 'application/json'}
    );
}

/**
 * GET <any> eg. "/" or "/foo/bar/baz": renders a page.
 */
function handlePageRequest(req) {
    var page = website.siteGraph.getPage(req.url);
    if (page) {
        if (req.getUrlParam('rescan')) {
            commons.signals.emit('sitegraphRescanRequested', page);
        }
        var pageData = {};
        var html = page.render(pageData);
        return new http.Response(200, injectControlPanelIFrame(html, pageData));
    } else {
        return new http.Response(404, injectControlPanelIFrame(
            '<!DOCTYPE html><html><title>Not found</title><body>Not found', null));
    }
}

/**
 * GET /api/website/generate: writes all pages to disk.
 *
 * Example response:
 * {
 *     wrotePagesNum: 5,
 *     tookSecs: 0.002672617,
 *     totalPages: 6,
 *     sitePath: '/some/path/',
 *     outDir: 'my/dir',
 *     issues: ['/some-url>Some error.']
 * }
 */
function handleGenerateRequest() {
    var out = {
        wrotePagesNum: 0,
        tookSecs: performance.now(),
        totalPages: website.siteGraph.pageCount,
        sitePath: '/some/path/',
        outDir: 'out',
        issues: []
    };
    out.wrotePagesNum = website.website.generate(function(renderedOutput, page) {
        // 'path/out' + '/foo', 'path/out' + '/'
        var dirPath = insnEnv.sitePath + 'out' + page.url;
        return website.website.fs.makeDirs(dirPath) &&
                website.website.fs.write(
                    // 'path/out/foo' + '/index.html', 'path/out/' + 'index.html'
                    dirPath + (page.url.length > 1 ? '/index.html' : 'index.html'),
                    renderedOutput
                );
    }, out.issues);
    out.tookSecs = (performance.now() - out.tookSecs) / 1000;
    return new http.Response(200, JSON.stringify(out),
        {'Content-Type': 'application/json'}
    );
}

/**
 * GET /api/website/upload: renders all pages, and uploads them to a server
 * using FTP.
 *
 * Payload:
 * remoteUrl=str|required&
 * username=str|required&
 * password=str|required
 *
 * Example response:
 * /some/page|000
 */
function handleUploadRequest(req) {
    uploadHandlerIsBusy = true;
    //
    var errs = [];
    if (!req.data.remoteUrl) errs.push('Remote url is required.');
    if (!req.data.username) errs.push('Username is required.');
    if (!req.data.password) errs.push('Password is required.');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    var generated = [];
    var issues = [];
    website.website.generate(function(renderedOutput, page) {
        generated.push({url: page.url, html: renderedOutput});
        return true;
    }, issues);
    if (issues.length) {
        return new http.Response(400, issues.join('\n'));
    }
    //
    return new http.ChunkedResponse(200, function getNewChunk(state) {
        // We're done
        if (state.nthPage > state.totalIncomingPages) {
            uploadHandlerIsBusy = false;
            return '';
        }
        // Upload the next page
        if (!state.hadStopError) {
            var cur = state.generatedPages[state.nthPage - 1];
            var url = cur.url.length > 1 ? cur.url : 'index';
            var uploadRes = state.uploader.upload(state.remoteUrl +
                (url.charAt(0) == '/' ? url.substr(1) : url) + '.html', cur.html);
            state.hadStopError = uploadRes == commons.Uploader.UPLOAD_LOGIN_DENIED;
            state.nthPage += 1;
            return cur.url + '|' + ('000' + uploadRes).slice(-3);
        }
        // Previous upload had a problem -> abort
        throw new Error('...');
    }, {
        nthPage: 1,
        totalIncomingPages: generated.length,
        generatedPages: generated,
        remoteUrl: req.data.remoteUrl.charAt(req.data.remoteUrl.length - 1) == '/'
            ? req.data.remoteUrl : req.data.remoteUrl + '/',
        uploader: new website.website.Uploader(req.data.username, req.data.password),
        hadStopError: false
    });
}

function rejectUploadRequest() {
    return new http.Response(409, 'The upload process has already started.');
}

/**
 * GET /api/website/num-pending-changes.
 */
function handleGetNumPendingChanges() {
    var count = 0;
    var UPLOAD_STATUS_UPLOADED = 2;
    commons.db.select('select count(`url`) from uploadStatuses where `status` = ' +
        UPLOAD_STATUS_UPLOADED, function(row) {
        count = row.getInt(0);
    });
    //
    return new http.Response(200, website.siteGraph.pageCount - count,
        {'Content-Type': 'application/json'});
}

/**
 * @param {string} html <html>body><p>foo</p>...
 * @param {Object?} pageData {
 *     directiveInstances: [{...}...]
 *     allComponents: [{...,cmp:{id:<id>,name:<name>...}}]
 * }
 * @returns {string} <html>body><iframe...<p>foo</p>...
 */
function injectControlPanelIFrame(html, pageData) {
    var pos = html.indexOf('<body>');
    if (pos > -1) {
        var bodyInnerStart = pos + 6;
        return html.substr(0, bodyInnerStart) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:200px;right:4px;top:4px;"></iframe><script>function setIframeVisible(setVisible) { document.getElementById(\'insn-cpanel-iframe\').style.width = setVisible ? \'80%\' : \'200px\'; } function getCurrentPageData() { return ' + JSON.stringify(pageData) + '; }</script>' + html.substr(bodyInnerStart);
    }
    return html;
}