var commons = require('common-services.js');
var website = require('website.js');
var http = require('http.js');
var uploadHandlerIsBusy = false;

commons.app.addRoute(function(url, method) {
    if (method == 'GET' && url == '/api/website/pages')
        return handleGetAllPagesRequest;
    if (method == 'GET' && url == '/api/website/templates')
        return handleGetAllTemplatesRequest;
    if (method == 'POST' && url == '/api/website/generate')
        return handleGenerateRequest;
    if (method == 'POST' && url == '/api/website/upload') {
        if (!uploadHandlerIsBusy) return handleUploadRequest;
        else return rejectUploadRequest;
    }
    if (method == 'GET' && url == '/api/website/num-pending-changes')
        return handleGetNumPendingChanges;
    if (method == 'PUT' && url == '/api/website/page')
        return handleUpdatePageRequest;
    if (method == 'GET')
        return handlePageRequest;
});

/**
 * GET <any> eg. "/" or "/foo/bar/baz": renders a page.
 */
function handlePageRequest(req) {
    var page = website.siteGraph.getPage(req.url != '/' ? req.url : website.siteConfig.homeUrl);
    if (page) {
        var rescanRootPageUrl = req.getUrlParam('rescan');
        if (rescanRootPageUrl) {
            commons.signals.emit('sitegraphRescanRequested',
                rescanRootPageUrl == 'current-page' ? page :
                    website.siteGraph.getPage(rescanRootPageUrl));
        }
        var dataToFrontend = {};
        var html = page.render(dataToFrontend);
        return new http.Response(200, injectControlPanelIFrame(html, dataToFrontend));
    } else {
        return new http.Response(404, injectControlPanelIFrame(
            '<!DOCTYPE html><html><title>Not found</title><body>Not found', null));
    }
}

/**
 * GET /api/website/pages: lists all pages.
 *
 * Example response:
 * [
 *     {"url":"/","layoutFileName":"foo.jsx.htm","uploadStatus":0},
 *     {"url":"/foo","layoutFileName":"foo.jsx.htm","uploadStatus":0}
 * ]
 */
function handleGetAllPagesRequest() {
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
 * GET /api/website/template: lists all templates.
 *
 * Example response:
 * [
 *     {"fileName":"foo.jsx.htm"},
 *     {"fileName":"bar.jsx.htm"}
 * ]
 */
function handleGetAllTemplatesRequest() {
    var templates = [];
    for (var fileName in website.siteGraph.templates)
        templates.push({fileName: fileName});
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
 * password=str|required
 *
 * Example response:
 * /some/page|0
 */
function handleUploadRequest(req) {
    uploadHandlerIsBusy = true;
    //
    var errs = [];
    if (!req.data.remoteUrl) errs.push('remoteUrl is required.');
    if (!req.data.username) errs.push('username is required.');
    if (!req.data.password) errs.push('password is required.');
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
            // /home        -> 'site.net/htdocs/home/index.html'
            // /home/2      -> 'site.net/htdocs/home/2/index.html'
            // /home/page/2 -> 'site.net/htdocs/home/page/2/index.html'
            var uploadRes = state.uploader.upload(state.remoteUrl + cur.url.substr(1) +
                                                  '/index.html', cur.html);
            state.hadStopError = uploadRes == commons.Uploader.UPLOAD_LOGIN_DENIED;
            state.nthPage += 1;
            return cur.url + '|' + uploadRes;
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
    var layout = website.siteGraph.getTemplate(req.data.layoutFileName);
    if (layout && !layout.samplePage) layout.samplePage = page;
    var ok = commons.db.update('update websites set `graph` = ?', function(stmt) {
        stmt.bindString(0, website.siteGraph.serialize());
    });
    return new http.Response(200, JSON.stringify({numAffectedRows: ok}),
        {'Content-Type': 'application/json'});
}

/**
 * @param {string} html <html>body><p>foo</p>...
 * @param {Object?} dataToFrontend {
 *     page: {url: <str>, layoutFileName: <str>},
 *     directiveInstances: [{type: <str>, contentNodes: [<cnode>...]...}...],
 *     allContentNodes: [{..., defaults: {id: <id>, name: <name>...}}],
 * }
 * @returns {string} <html>body><iframe...<p>foo</p>...
 */
function injectControlPanelIFrame(html, dataToFrontend) {
    var pos = html.indexOf('<body>');
    if (pos > -1) {
        var bodyInnerStart = pos + 6;
        return html.substr(0, bodyInnerStart) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:220px;right:4px;top:4px;"></iframe><script>function setIframeVisible(setVisible) { document.getElementById(\'insn-cpanel-iframe\').style.width = setVisible ? \'80%\' : \'200px\'; } function getCurrentPageData() { return ' + JSON.stringify(dataToFrontend) + '; }</script>' + html.substr(bodyInnerStart);
    }
    return html;
}