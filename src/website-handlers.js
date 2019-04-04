/**
 * # website-handlers.js
 *
 * This file contains handlers for GET|PUT|POST /api/websites/*.
 *
 */
const {app} = require('./app.js');
const {webApp, BasicResponse, makeJsonResponse} = require('./web.js');
const commons = require('./common-services.js');
const data = require('./static-data.js');
const {UploadStatus} = require('./website.js');
const {templateCache} = require('./templating.js');
const {RemoteDiff} = require('./website-diff.js');

exports.init = () => {
    webApp.addRoute((url, method) => {
        if (method == 'GET' && url == '/api/websites')
            return handleGetAllWebsites;
        if (method === 'POST' && url === '/api/websites')
            return handleCreateWebsiteRequest;
        if (method === 'PUT' && url === '/api/websites/set-current')
            return handleSetCurrentWebsiteRequest;
        if (method === 'GET' && url === '/api/websites/sample-content-types')
            return handleGetAllSampleContentTypesRequest;
    });
    webApp.addRoute((url, method) => {
        if (!app.currentWebsite)
            return rejectRequest;
        if (method == 'GET') {
            if (url == '/api/websites/current/num-waiting-uploads')
                return handleGetNumWaitingUploads;
            if (url === '/api/websites/current/waiting-uploads')
                return handleGetWaitingUploadsRequest;
            if (url === '/api/websites/current/templates')
                return handleGetAllTemplatesRequest;
            if (url === '/api/websites/current/site-graph')
                return handleGetSiteGraphRequest;
            return handlePageRequest;
        }
        if (method == 'POST') {
            if (url === '/api/websites/current/generate')
                return handleGenerateRequest;
        }
        if (method == 'PUT') {
            if (url === '/api/websites/current/page')
                return handleUpdatePageRequest;
            if (url === '/api/websites/current/site-graph')
                return handleUpdateSiteGraphRequest;
        }
    });
};

/**
 * GET <any> eg. "/" or "/foo/bar/baz": renders a page.
 */
function handlePageRequest(req) {
    let w = app.currentWebsite;
    let page = w.graph.getPage(req.url !== '/' ? req.url : w.config.homeUrl);
    let dataToFrontend = {directiveElems: [], allContentNodes: [], page: {}};
    if (page) {
        let rescanType = req.params.rescan;
        if (rescanType) {
            commons.signals.emit('siteGraphRescanRequested', rescanType);
        }
        let html = w.renderPage(page, dataToFrontend);
        dataToFrontend.page = {url: page.url, layoutFileName: page.layoutFileName};
        return new BasicResponse(200, injectControlPanelIFrame(html, dataToFrontend));
    }
    return new BasicResponse(404, injectControlPanelIFrame(
        '<!DOCTYPE html><html><title>Not found</title><body>Not found</body></htm>',
        dataToFrontend));
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
    return makeJsonResponse(200, app.db.prepare('select * from websites').all());
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
    let errs = [];
    if (!req.data.dirPath) errs.push('dirPath is required.');
    else { if (req.data.dirPath.charAt(req.data.dirPath.length - 1) != '/') req.data.dirPath += '/'; }
    if (!req.data.sampleDataName) errs.push('sampleDataName is required.');
    if (req.data.name && req.data.name.length > 128) errs.push('name.length must be <= 128');
    if (errs.length) return new BasicResponse(400, errs.join('\n'));
    //
    try {
        app.setWaitingWebsite(req.data.dirPath);
        app.waitingWebsite.install(req.data.sampleDataName);
        app.db.prepare('insert or replace into websites (`dirPath`,`name`) \
                       values (?, ?)').run(req.data.dirPath, req.data.name);
        return makeJsonResponse(200, {status: 'ok'});
    } catch (e) {
        return makeJsonResponse(500, {status: 'err', details: e.message || '-'});
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
    let errs = [];
    if (!req.data.dirPath) errs.push('dirPath is required.');
    else { if (req.data.dirPath.charAt(req.data.dirPath.length - 1) != '/') req.data.dirPath += '/'; }
    if (errs.length) return new BasicResponse(400, errs.join('\n'));
    //
    if (!app.currentWebsite || app.currentWebsite.dirPath != req.data.dirPath) {
        try {
            app.setCurrentWebsite(req.data.dirPath);
        } catch (e) {
            return makeJsonResponse(500, {status: 'err', details: e.message || '-'});
        }
    }
    return makeJsonResponse(200, {status: 'ok'});
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
    return makeJsonResponse(200, data.getSampleData().map(d =>
        ({name: d.name, contentTypes: JSON.parse(d.contentTypes)})
    ));
}

/**
 * GET /api/websites/current/num-waiting-uploads.
 */
function handleGetNumWaitingUploads() {
    return makeJsonResponse(200, app.currentWebsite.db.prepare(
         'select count(`url`) as url from uploadStatuses where \
         `uphash` is null or `curhash` != `uphash` or\
         `curhash` is null and `uphash` is not null').get().url);
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
    let out = {pages: [], files: []};
    app.currentWebsite.db.prepare('select `url`, `curhash`, `uphash`, `isFile` \
        from uploadStatuses where `uphash` is null or `curhash` != `uphash` or\
        (`curhash` is null and `uphash` is not null)').raw().all().forEach(row => {
            (row[3] == 0 ? out.pages : out.files).push({
                url: row[0],
                uploadStatus: !row[2] ? UploadStatus.NOT_UPLOADED :
                            row[1] ? UploadStatus.OUTDATED : UploadStatus.DELETED
            });
        });
    return makeJsonResponse(200, out);
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
    const templates = [];
    const all = templateCache._fns;
    for (const name in all) {
        if (name.indexOf('.htm') > -1) templates.push({fileName: name});
    }
    return makeJsonResponse(200, templates);
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
    const out = {pages: []};
    for (const url in app.currentWebsite.graph.pages) {
        out.pages.push({url: url});
    }
    return makeJsonResponse(200, out);
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
    const w = app.currentWebsite;
    const out = {
        wrotePagesNum: 0,
        tookSecs: w.performance.now(),
        totalPages: w.graph.pageCount,
        outPath: w.dirPath + 'out',
        issues: []
    };
    try {
        w.generate((renderedOutput, page) => {
            // 'path/out' + '/foo'
            const dirPath = out.outPath + page.url;
            if (!w.fs.existsSync(dirPath)) {
                w.fs.mkdirSync(dirPath, {recursive: true});
            }
            // 'path/out/foo' + '/index.html'
            w.fs.writeFileSync(dirPath + '/index.html', renderedOutput);
            out.wrotePagesNum += 1;
            return true;
        }, out.issues);
    } catch(e) {
        app.log('[Error]: ' + e.message);
        return new BasicResponse(500, 'Failed to generate the site.',
            {'Content-Type': 'text/plain'});
    }
    out.tookSecs = (w.performance.now() - out.tookSecs) / 1000;
    return makeJsonResponse(200, out);
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
    const errs = [];
    const w = app.currentWebsite;
    let page = null;
    if (req.data.url) {
        page = w.graph.getPage(req.data.url);
        if (!page) errs.push('Page' + req.data.url + ' not found.');
    } else {
        errs.push('url is required.');
    }
    if (!req.data.layoutFileName) errs.push('layoutFileName is required.');
    if (errs.length) return new BasicResponse(400, errs.join('\n'));
    //
    page.layoutFileName = req.data.layoutFileName;
    return makeJsonResponse(200, {numAffectedRows: w.saveToDb(w.graph)});
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
    const w = app.currentWebsite;
    const remoteDiff = new RemoteDiff(w);
    let i = 0;
    for (; i < req.data.deleted.length; ++i) {
        const url = req.data.deleted[i];
        if (!w.graph.getPage(url)) {
            return new BasicResponse(400, 'Page \'' + url + '\' not found.');
        }
        remoteDiff.addPageToDelete(url);
        delete w.graph.pages[url];
    }
    if (i === 0) return new BasicResponse(400, 'Nothing to update.');
    //
    w.saveToDb(w.graph); // update websites set `graph` = ...
    remoteDiff.saveStatusesToDb(); // update|delete from uploadStatuses ...
    return makeJsonResponse(200, {status: 'ok'});
}

////////////////////////////////////////////////////////////////////////////////

function rejectRequest() {
    // Precondition Required
    return new BasicResponse(428, 'The current website is not set ' +
                                  '(app.currentWebsite == null)');
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
    const bodyEnd = html.indexOf('</body>');
    if (bodyEnd > -1) {
        return html.substr(0, bodyEnd) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' + JSON.stringify(dataToFrontend) + ';}</script>' + html.substr(bodyEnd);
    }
    return html;
}
