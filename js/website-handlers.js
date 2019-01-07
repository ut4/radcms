var commons = require('common-services.js');
var website = require('website.js');
var http = require('http.js');

commons.app.addRoute(function(url, method) {
    if (method == 'POST' && url == '/api/website/generate')
        return handleGenerateRequest;
    if (method == 'GET' && url == '/api/website/num-pending-changes')
        return handleGetNumPendingChanges;
    if (method == 'GET')
        return handlePageRequest;
});

/**
 * Responds to GET <any> eg. "/" or "/foo/bar/baz".
 */
function handlePageRequest(req) {
    var page = website.siteGraph.getPage(req.url);
    if (page) {
        return new http.Response(200, injectControlPanelIFrame(page.render()));
    } else {
        return new http.Response(404, injectControlPanelIFrame(
            '<!DOCTYPE html><html><title>Not found</title><body>Not found'));
    }
}

/**
 * Responds to GET /api/website/generate.
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
    out.wrotePagesNum = website.generate(function(renderedOutput, page) {
        var dirPath = 'out/path/' + page.url;
        return commons.fs.makeDirs(dirPath) &&
                commons.fs.write(
                    dirPath + page.url.length > 1 ? '/index.html' : 'index.html',
                    renderedOutput
                );
    });
    out.tookSecs = (performance.now() - out.tookSecs) / 1000;
    return new http.Response(200, JSON.stringify(out), {'Content-Type': 'application/json'});
}

/**
 * Responds to GET /api/website/num-pending-changes.
 */
function handleGetNumPendingChanges() {
    return new http.Response(200, '4', {'Content-Type': 'application/json'});
}

/**
 * @param {string} html <html>body><p>foo</p>...
 * @returns {string} <html>body><iframe...<p>foo</p>...
 */
function injectControlPanelIFrame(html) {
    var pos = html.indexOf('<body>');
    if (pos > -1) {
        var bodyInnerStart = pos + 6;
        return html.substr(0, bodyInnerStart) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:200px;right:4px;top:4px;"></iframe><script>function setIframeVisible(setVisible) { document.getElementById(\'insn-cpanel-iframe\').style.width = setVisible ? \'80%\' : \'200px\'; } function getCurrentPageData() { return {directiveInstances:[],allComponents: []}; }</script>' + html.substr(bodyInnerStart);
    }
    return html;
}