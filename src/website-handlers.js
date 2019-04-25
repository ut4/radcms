/**
 * # website-handlers.js
 *
 * This file contains http-handlers for GET|PUT|POST /api/websites/*.
 *
 */
const {app} = require('./app.js');
const {webApp} = require('./web.js');
const commons = require('./common-services.js');
const data = require('./static-data.js');
const {UploadStatus} = require('./website.js');
const {templateCache} = require('./templating.js');
const diff = require('./website-diff.js');

const makeErrorHtml = (message, title = message) =>
    `<!DOCTYPE html><html><title>${title}</title><body>${message}</body></htm>`;
const notFoundHtml = makeErrorHtml('Not found');

exports.init = () => {
    webApp.addRoute((url, method) => {
        if (method === 'GET' && url == '/api/websites')
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
        if (method === 'GET') {
            if (url === '/api/websites/current/num-waiting-uploads')
                return handleGetNumWaitingUploads;
            if (url === '/api/websites/current/waiting-uploads')
                return handleGetWaitingUploadsRequest;
            if (url === '/api/websites/current/templates')
                return handleGetAllTemplatesRequest;
            if (url.indexOf('/api/websites/current/site-graph') > -1)
                return handleGetSiteGraphRequest;
            return handlePageRequest;
        }
        if (method === 'POST') {
            if (url === '/api/websites/current/generate')
                return handleGenerateRequest;
            if (url === '/api/websites/current/upload')
                return handleUploadRequest;
        }
        if (method === 'PUT') {
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
function handlePageRequest(req, res) {
    const w = app.currentWebsite;
    const page = w.graph.getPage(req.path !== '/' ? req.path : w.config.homeUrl);
    const dataToFrontend = {directiveElems: [], allContentNodes: [], page: {},
                            sitePath: w.dirPath};
    let html;
    let code = 200;
    if (page) {
        if (req.params.rescan) {
            commons.signals.emit('siteGraphRescanRequested', req.params.rescan);
        }
        try {
            html = w.renderPage(page, dataToFrontend);
            dataToFrontend.page = {url: page.url, layoutFileName: page.layoutFileName};
        } catch (e) {
            code = 500;
            html = makeErrorHtml('<pre>' + e.stack
                                 .replace(/</g, '&lt;')
                                 .replace(/>/g, '&gt;') + '</pre>', 'Fail');
        }
    } else {
        code = 404;
        html = notFoundHtml;
    }
    res.send(code, injectControlPanelIFrame(html, dataToFrontend));
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
function handleGetAllWebsites(_, res) {
    res.json(200, app.db.prepare('select * from websites').all());
}

/**
 * POST /api/websites: Creates a new website to $req.dirPath, populates it
 * with $req.sampleDataName data, and finally registers it to the global database.
 * Assumes that $req.dirPath already exists. Overwrites existing files (site.ini,
 * site.db).
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
function handleCreateWebsiteRequest(req, res) {
    //
    const errs = [];
    if (!req.data.dirPath) errs.push('dirPath is required.');
    else { if (req.data.dirPath.charAt(req.data.dirPath.length - 1) != '/') req.data.dirPath += '/'; }
    if (!req.data.sampleDataName) errs.push('sampleDataName is required.');
    if (req.data.name && req.data.name.length > 128) errs.push('name.length must be <= 128');
    if (errs.length) { res.plain(400, errs.join('\n')); return; }
    //
    try {
        app.setWaitingWebsite(req.data.dirPath);
        app.waitingWebsite.install(req.data.sampleDataName);
        app.db.prepare('insert or replace into websites (`dirPath`,`name`) \
                       values (?, ?)').run(req.data.dirPath, req.data.name);
        res.json(200, {status: 'ok'});
    } catch (e) {
        res.json(500, {status: 'err', details: e.message || '-'});
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
function handleSetCurrentWebsiteRequest(req, res) {
    //
    const errs = [];
    if (!req.data.dirPath) errs.push('dirPath is required.');
    else { if (req.data.dirPath.charAt(req.data.dirPath.length - 1) != '/') req.data.dirPath += '/'; }
    if (errs.length) { res.plain(400, errs.join('\n')); return; }
    //
    if (!app.currentWebsite || app.currentWebsite.dirPath != req.data.dirPath) {
        try {
            app.setCurrentWebsite(req.data.dirPath);
        } catch (e) {
            res.json(500, {status: 'err', details: e.message || '-'});
            return;
        }
    }
    res.json(200, {status: 'ok'});
}

/**
 * GET /api/websites/sample-content-types: lists the default sample content types.
 *
 * Example response:
 * [
 *     {"name":"minimal","contentTypes":[
 *         {"name":"Generic","fields":{"content":"richtext"}}
 *     ]},
 *     {"name":"blog","contentTypes":[
 *         {"name":"Generic","fields":{"content":"richtext"}},
 *         {"name":"Article","fields":{"title":"text","body":"richtext"}}
 *     ]}
 * ]
 */
function handleGetAllSampleContentTypesRequest(_, res) {
    res.json(200, data.getSampleData());
}

/**
 * GET /api/websites/current/num-waiting-uploads.
 */
function handleGetNumWaitingUploads(_, res) {
    res.json(200, app.currentWebsite.db.prepare(
        'select count(`url`) as num from uploadStatuses where \
        `uphash` is null or `curhash` != `uphash` or\
        `curhash` is null and `uphash` is not null').get().num);
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
function handleGetWaitingUploadsRequest(_, res) {
    const out = {pages: [], files: []};
    app.currentWebsite.db.prepare('select `url`, `curhash`, `uphash`, `isFile` \
        from uploadStatuses where `uphash` is null or `curhash` != `uphash` or\
        (`curhash` is null and `uphash` is not null)').raw().all().forEach(row => {
            (row[3] == 0 ? out.pages : out.files).push({
                url: row[0],
                uploadStatus: !row[2] ? UploadStatus.NOT_UPLOADED :
                               row[1] ? UploadStatus.OUTDATED : UploadStatus.DELETED
            });
        });
    res.json(200, out);
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
function handleGetAllTemplatesRequest(_, res) {
    const templates = [];
    const all = templateCache._fns;
    for (const name in all) {
        if (name.indexOf('.htm') > -1) templates.push({fileName: name});
    }
    res.json(200, templates);
}

/**
 * GET /api/websites/current/site-graph[?files=any]: Returns the contents of the
 * site graph.
 *
 * Example response:
 * {
 *     "pages":[{"url":"/home"}],
 *     "files":[{"url":"/theme.css"}]
 * }
 */
function handleGetSiteGraphRequest(req, res) {
    const out = {pages: [], files: []};
    const w = app.currentWebsite;
    for (const url in w.graph.pages) {
        out.pages.push({url: url});
    }
    if (req.params.files) {
        out.files = getAllFiles(w);
    }
    res.json(200, out);
}

/**
 * GET /api/websites/current/generate: writes all pages to a local disk.
 *
 * Payload:
 * {
 *     pages: Array<number>; // List of indices referring to the "pages"-array of GET /api/website/site-graph
 *     files: Array<number>; // List of indices referring to the "files"-array of GET /api/website/site-graph
 * }
 *
 * Example response:
 * {
 *     "tookSecs": 0.002672617,
 *     "wrotePagesNum": 5,
 *     "wroteFilesNum": 2,
 *     "totalPages": 6,
 *     "totalFiles": 2,
 *     "issues": ["/some-url>Some error."]
 * }
 */
function handleGenerateRequest(req, res) {
    const w = app.currentWebsite;
    const out = {
        tookSecs: w.performance.now(),
        wrotePagesNum: 0,
        wroteFilesNum: 0,
        totalPages: w.graph.pageCount,
        totalFiles: req.data.files.length,
        issues: []
    };
    let numPendingItems = out.totalPages + out.totalFiles;
    const onItemCompleted = () => {
        if (!--numPendingItems) {
            out.tookSecs = (w.performance.now() - out.tookSecs) / 1000;
            res.json(200, out);
        }
    };
    try {
        // 1. Validate
        const allFiles = out.totalFiles ? getAllFiles(w) : [];
        const errors = [];
        for (let i = 0; i < out.totalFiles; ++i) {
            if (!allFiles[i]) errors.push(req.data.files[i] +
                ' is not valid file index (min: 0, max: ' + (out.totalFiles - 1) + ')');
        }
        if (errors.length) { res.plain(400, errors.join('\n')); return; }
        // 2. Copy asset files
        const outPath = w.dirPath + 'out';
        const fromDir = w.dirPath.substr(0, w.dirPath.length - 1);
        for (let i = 0; i < out.totalFiles; ++i) {
            const filePath = allFiles[req.data.files[i]].url;
            const targetPath = outPath + filePath;
            //                    '/path/out/file.js' -> '/path/out'
            ensureDirExists(w.fs, targetPath.substr(0, targetPath.lastIndexOf('/')), () => {
                w.fs.copyFile(fromDir + filePath, targetPath, err => {
                    if (err) throw err;
                    out.wroteFilesNum += 1;
                    onItemCompleted();
                });
            });
        }
        // 3. Generate and write pages
        w.generate((renderedOutput, page) => {
            // 'path/out' + '/foo'
            const dirPath = outPath + page.url;
            ensureDirExists(w.fs, dirPath, () => {
                // 'path/out/foo' + '/index.html'
                w.fs.writeFile(dirPath + '/index.html', renderedOutput, err => {
                    if (err) throw err;
                    out.wrotePagesNum += 1;
                    onItemCompleted();
                });
            });
            return true;
        }, out.issues);
    } catch (e) {
        app.log('[Error]: ' + e.message);
        res.plain(500, 'Failed to generate the site.');
        return;
    }
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
 *     pageUrls: Array<{  // required if fileNames.length == 0
 *         url: string;
 *         isDeleted: number;
 *     }>;
 *     fileNames: Array<{ // required if pageUrls.length == 0
 *         fileName: string;
 *         isDeleted: number;
 *     }>;
 * }
 *
 * Example response chunk:
 * file|/some-file.css|0|
 * - or -
 * page|/some/url|0|
 */
function handleUploadRequest(req, res) {
    //
    const errs = [];
    if (!req.data.remoteUrl) errs.push('remoteUrl is required.');
    if (!req.data.username) errs.push('username is required.');
    if (!req.data.password) errs.push('password is required.');
    if ((!req.data.pageUrls || !req.data.pageUrls.length) &&
        (!req.data.fileNames || !req.data.fileNames.length)) {
        errs.push('pageUrls or fileNames is required.');
    }
    if (errs.length) { res.plain(400, errs.join('\n')); return; }
    //
    const pageUrls = {};
    const issues = [];
    const data = makeUploadReqData(req.data, pageUrls);
    // Render all pages in one go so we can return immediately if there was any issues
    if (data.numUploadablePages) {
        if (!app.currentWebsite.generate((renderedOutput, page) => {
            data.generatedPages.push({url: page.url, html: renderedOutput});
        }, issues, pageUrls)) {
            res.plain(400, issues.join('\n'));
            return;
        }
    }
    const afterEachFtpTask = (ftpResponseOrError, url, contents, resourceType) => {
        const hadStopError = commons.Uploader.isLoginError(ftpResponseOrError.code);
        const status = !hadStopError && ftpResponseOrError.name != 'FTPError'
            ? 'ok'
            : ftpResponseOrError.message;
        if (status === 'ok') saveOrDeleteUploadStatus(url, contents);
        res.writeChunk(resourceType + '|' +  url + '|' + status + '|');
        if (hadStopError) throw new Error('Unrecoverable FTP error');
    };
    // Start the sync process
    res.beginChunked();
    return data.uploader.open(data.remoteUrl, req.data.username, req.data.password)
        // Delete removed pages first ...
        .then(() => waterfall(data.deletablePageUrls.map(url => () =>
            data.uploader.delete(url + '/index.html', true)
                .then(res => afterEachFtpTask(res, url, null, 'page'))
                .catch(err => afterEachFtpTask(err, url, null, 'page'))
        )))
        // then delete removed files ...
        .then(() => waterfall(data.deletableFileNames.map(fname => () =>
            data.uploader.delete(fname, false)
                .then(res => afterEachFtpTask(res, fname, null, 'file'))
                .catch(err => afterEachFtpTask(err, fname, null, 'file'))
        )))
        // then upload new files ...
        .then(() => waterfall(data.uploadFileNames.map(fname => () => {
            const contents = app.currentWebsite.readOwnFile(fname);
            return data.uploader.upload(fname, contents)
                .then(res => afterEachFtpTask(res, fname, contents, 'file'))
                .catch(err => afterEachFtpTask(err, fname, contents, 'file'));
        })))
        // and lastly upload new or modified pages
        .then(() =>
            waterfall(data.generatedPages.map(page => () =>
                data.uploader.upload(page.url + '/index.html', page.html)
                    .then(res => afterEachFtpTask(res, page.url, page.html, 'page'))
                    .catch(err => afterEachFtpTask(err, page.url, page.html, 'page'))
            ))
        )
        .then(() => {
            res.endChunked();
        })
        .catch(e => {
            app.log('[Error]: there was an issue during the upload: ' + e.message);
            res.endChunked();
        });
}

function saveOrDeleteUploadStatus(url, contents) {
    if (contents) {
        app.currentWebsite.db
            .prepare('update uploadStatuses set `uphash` = ? where `url` = ?')
            .run(diff.sha1(contents), url);
    } else {
        if (app.currentWebsite.db
                .prepare('delete from uploadStatuses where `url` = ?')
                .run(url).changes < 0) {
            commons.log('[Error]: Failed to delete \'' + url + '\' from uploadStatuses.');
        }
    }
}

function makeUploadReqData(reqData, pageUrls) {
    const data = {
        deletablePageUrls: [],
        deletableFileNames: [],
        generatedPages: [],
        numUploadablePages: 0,
        uploadFileNames: [],
        uploader: app.currentWebsite.uploader,
        remoteUrl: !reqData.remoteUrl.endsWith('/')
            ? reqData.remoteUrl
            : reqData.remoteUrl.substr(0, reqData.remoteUrl.length - 1)
    };
    for (let i = 0; i < reqData.fileNames.length; ++i) {
        const file = reqData.fileNames[i];
        if (file.isDeleted == 0) {
            data.uploadFileNames.push(file.fileName);
        } else {
            data.deletableFileNames.push(file.fileName);
        }
    }
    for (let i = 0; i < reqData.pageUrls.length; ++i) {
        const page = reqData.pageUrls[i];
        if (page.isDeleted == 0) {
            pageUrls[page.url] = 1;
            data.numUploadablePages += 1;
        } else {
            data.deletablePageUrls.push(page.url);
        }
    }
    return data;
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
function handleUpdatePageRequest(req, res) {
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
    if (errs.length) { res.plain(400, errs.join('\n')); return; }
    //
    page.layoutFileName = req.data.layoutFileName;
    res.json(200, {numAffectedRows: w.saveToDb(w.graph)});
}

/**
 * PUT /api/websites/current/site-graph: deletes the requested pages from the
 * site graph, and syncs the changes to the database.
 *
 * Payload:
 * {
 *     deleted: Array<string>; // required
 * }
 *
 * Example response:
 * {"status":"ok"}
 */
function handleUpdateSiteGraphRequest(req, res) {
    const w = app.currentWebsite;
    const remoteDiff = new diff.RemoteDiff(w);
    for (var i = 0; i < req.data.deleted.length; ++i) {
        const url = req.data.deleted[i];
        if (!w.graph.getPage(url)) {
            res.send(400, 'Page \'' + url + '\' not found.');
            return;
        }
        remoteDiff.addPageToDelete(url);
        delete w.graph.pages[url];
    }
    if (i === 0) { res.send(400, 'Nothing to update.'); return; }
    //
    w.saveToDb(w.graph); // update websites set `graph` = ...
    remoteDiff.syncToDb(); // update|delete from uploadStatuses ...
    res.json(200, {status: 'ok'});
}

////////////////////////////////////////////////////////////////////////////////

function rejectRequest(_, res) {
    // Precondition Required
    res.send(428, 'No website is selected. <a href="/frontend/app.html">To dashboard</a>.');
}

/**
 * @param {string} html <html>...<p>foo</p></body>...
 * @param {Object} dataToFrontend {page: Object; directiveElems: Object[]...}
 * @returns {string} <html>...<p>foo</p><iframe...</body>...
 */
function injectControlPanelIFrame(html, dataToFrontend) {
    const bodyEnd = html.indexOf('</body>');
    if (bodyEnd > -1) {
        return html.substr(0, bodyEnd) + '<iframe src="/frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' + JSON.stringify(dataToFrontend) + ';}</script>' + html.substr(bodyEnd);
    }
    return html;
}

function getAllFiles(w) {
    return w.db.prepare('select `url` from uploadStatuses ' +
                        'where `curhash` is not null and `isFile` = 1').all();
}

function waterfall(getterFns, i = 0) {
    if (!getterFns.length) return;
    return getterFns[i]().then(() => {
        if (++i < getterFns.length) return waterfall(getterFns, i);
        // else we're done
    });
}

function ensureDirExists(fs, dirPath, then) {
    fs.stat(dirPath, err => {
        if (!err) { then(); return; }
        fs.mkdir(dirPath, {recursive: true}, err => {
            if (err) throw err;
            then();
        });
    });
}

exports.rejectRequest = rejectRequest;
