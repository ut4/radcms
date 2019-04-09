const {Stub, testEnv} = require('./env.js');
require('../src/website-handlers.js').init();
const {app} = require('../src/app.js');
const {webApp} = require('../src/web.js');
const {Website, UploadStatus} = require('../src/website.js');
const diff = require('../src/website-diff.js');
const {templateCache, transpiler} = require('../src/templating.js');
const {getSampleData} = require('../src/static-data.js');
const {FTPResponseCode} = require('../src/common-services.js');

QUnit.module('website-handlers.js (1)', hooks => {
    const resetDb = () => {
        if (app.db.prepare('delete from websites').run().changes < 1)
            throw new Error('Failed to clean test data.');
    };
    hooks.before(() => {
        testEnv.setupAppDb();
        testEnv.setupTestWebsite();
    });
    QUnit.test('GET \'/api/websites\' lists all websites', assert => {
        assert.expect(4);
        //
        const ancientUnixTime = 2;
        const testSites = [
            {id: 23, dirPath: 'a/a/', name: 'a.com'},
            {id: 64, dirPath: 'b/b/', name: null}
        ];
        if (app.db.prepare('insert into websites (`id`,`dirPath`,`name`) values \
                           (?,?,?),(?,?,?)').run([].concat(...testSites.map(testSite =>
                                [testSite.id, testSite.dirPath, testSite.name])
            )) < 1) throw new Error('Failed to insert test data');
        //
        const req = webApp.makeRequest('/api/websites', 'GET');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, actual] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.ok(actual[0].createdAt > ancientUnixTime, 'Should set default createdAt #1');
        assert.ok(actual[1].createdAt > ancientUnixTime, 'Should set default createdAt #2');
        delete actual[0].createdAt;
        delete actual[1].createdAt;
        assert.deepEqual(actual, testSites);
        //
        resetDb();
    });
    QUnit.test('POST \'/api/websites\' creates a new website', assert => {
        assert.expect(9);
        let fsWriteStub;
        const swwStub = new Stub(app, 'setWaitingWebsite', dirPath => {
            app.waitingWebsite = new Website(dirPath, {memory: true});
            fsWriteStub = new Stub(app.waitingWebsite.fs, 'writeFileSync');
            app.waitingWebsite.setApp(app);
        });
        //
        const inputDirPath = '/test/path';
        const inputWebsiteName = 'mysite.com';
        const req = webApp.makeRequest('/api/websites', 'POST',
            {dirPath: inputDirPath, sampleDataName: 'minimal',
             name: inputWebsiteName});
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.equal(JSON.stringify(body), '{"status":"ok"}');
        const minimalSampleData = getSampleData('minimal');
        // Assert that inserted sample data to the website db ($website.db)
        const row = app.waitingWebsite.db.prepare(
            'select c.`name` as n, count(s.`graph`) as c from contentNodes c\
             left join self s on (1 = 1)').get();
        assert.equal(row.n, 'footer');
        assert.equal(row.c, 1);
        // Assert that wrote sample data files
        const file1Call = fsWriteStub.callInfo[0];
        const file2Call = fsWriteStub.callInfo[1];
        assert.equal(fsWriteStub.callInfo.length, 2,
            'Should write all sample data files');
        const k = Object.keys(minimalSampleData.files);
        assert.deepEqual(
            {name: file1Call[0].replace(inputDirPath+'/',''), contents: file1Call[1]},
            {name: k[0], contents: minimalSampleData.files[k[0]]},
            'Should write sample data file #1'
        );
        assert.deepEqual(
            {name: file2Call[0].replace(inputDirPath+'/',''), contents: file2Call[1]},
            {name: k[1], contents: minimalSampleData.files[k[1]]},
            'Should write sample data file #2'
        );
        // Assert that registered the new website to the main db ($app.db)
        const row2 = app.db.prepare('select `dirPath`,`name` from websites').get();
        assert.equal(row2.dirPath, inputDirPath + '/');
        assert.equal(row2.name, inputWebsiteName);
        //
        swwStub.restore();
        fsWriteStub.restore();
        resetDb();
        app.waitingWebsite = null;
    });
    QUnit.test('PUT \'/api/websites/set-current\'', assert => {
        assert.expect(4);
        //
        const origCurrentWebsite = app.currentWebsite;
        const inputDirPath = '/test/path/to/my/site';
        const req = webApp.makeRequest('/api/websites/set-current', 'PUT',
                                       {dirPath: inputDirPath});
        app.setWaitingWebsite(inputDirPath + '/', {memory: true});
        const initStub = new Stub(app.waitingWebsite, 'activate', () => {});
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.equal(JSON.stringify(body), '{"status":"ok"}');
        assert.equal(app.currentWebsite.dirPath, inputDirPath + '/',
            'Should set $app.currentWebsite = $app.waitingWebsite');
        assert.equal(initStub.callInfo.length, 1, 'Should initialize the new website');
        //
        initStub.restore();
        app.currentWebsite = origCurrentWebsite;
    });
});

QUnit.module('website-handlers.js (2)', hooks => {
    const genericCntType = {id:1,name:'Generic',fields:'{"content":"richtext"}'};
    const homeContentCnt = {name:'home',json:{content:'Hello'},contentTypeName:'Generic'};
    const page2ContentCnt = {name:'/page2',json:{content:'Page2'},contentTypeName:'Generic'};
    const page3ContentCnt = {name:'/page3',json:{content:'Page3'},contentTypeName:'Generic'};
    const mockFiles = {'/foo.css': 'p {}', '/bar.js': 'const p;'};
    const mockFileNames = Object.keys(mockFiles);
    const layout1 = {fileName: 'home-layout.jsx.htm', contents:
            '@mainContent = fetchOne("Generic").where("name=\'home\'").exec()\n' +
            '<html>\n' +
            '    <head>\n' +
            '        <title>Hello home</title>\n' +
            '    </head>\n' +
            '    <body id="my-page">\n' +
            '        <p>{ mainContent.content }</p>\n' +
            '        <footer>...</footer>\n' +
            '    </body>\n' +
            '</html>'};
    const layout2 = {fileName: 'page-layout.jsx.htm', contents:
                '@mainContent = fetchOne("Generic").where("name=\'/"+url[0]+"\'").exec()\n' +
                '<html>\n' +
                '    <head>\n' +
                '        <title>Hello page</title>\n' +
                '    </head>\n' +
                '    <body>\n' +
                '        <p>{ mainContent.content }</p>\n' +
                '        <footer>...</footer>\n' +
                '    </body>\n' +
                '</html>'};
    const pages = [{url:'/home'}, {url:'/page2'}, {url:'/page3'}];
    const testWebsite = {id: 1};
    let page1, page2, page3;
    let fsReadStub;
    let website;
    let siteGraph;
    const q = '(?,?,?,?)';
    hooks.before(() => {
        testEnv.setupTestWebsite();
        website = app.currentWebsite;
        siteGraph = website.graph;
        website.config.homeUrl = pages[0].url;
        page1 = siteGraph.addPage(pages[0].url, '', layout1.fileName, {}, 1);
        page2 = siteGraph.addPage(pages[1].url, '', layout2.fileName, {}, 1);
        page3 = siteGraph.addPage(pages[2].url, '', layout2.fileName, {}, 1);
        templateCache.put(layout1.fileName, transpiler.transpileToFn(layout1.contents));
        templateCache.put(layout2.fileName, transpiler.transpileToFn(layout2.contents));
        const sql2 = 'insert into contentNodes values '+q+','+q+','+q;
        const sql3 = 'insert into uploadStatuses values '+q+','+q+','+q+','+q+','+q;
        const sql4 = 'insert into staticFileResources values (?,1),(?,1)';
        if (website.db.prepare('insert into self values (?,?)')
                .run(testWebsite.id, siteGraph.serialize()).changes < 1 ||
            website.db.prepare(sql2)
                .run([].concat(...[homeContentCnt,page2ContentCnt,page3ContentCnt].map((c, i) =>
                    [i + 1, c.name, JSON.stringify(c.json), c.contentTypeName]
                ))).changes < 3 ||
            website.db.prepare(sql3)
                .run(// url, curhash, uphash, isFile
                    mockFileNames[0], '', null, 1,
                    mockFileNames[1], '', null, 1,
                    page1.url,        '', null, 0,
                    page2.url,        '', null, 0,
                    page3.url,        '', null, 0
                ).changes < 5 ||
            website.db.prepare(sql4)
                .run(layout1.fileName, layout2.fileName).changes < 2
        ) throw new Error('Failed to insert test data.');
        //
        fsReadStub = new Stub(website.fs, 'readFileSync', fpath =>
            mockFiles[fpath.replace(website.dirPath,'/')]
        );
    });
    hooks.after(() => {
        fsReadStub.restore();
        website.graph.clear();
        if (website.db.prepare('delete from contentNodes where contentTypeName = ?')
                      .run(genericCntType.name).changes < 1 ||
            website.db.prepare('delete from self where id = ?')
                      .run(testWebsite.id).changes < 1 ||
            website.db.prepare('delete from uploadStatuses')
                      .run().changes < 5)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('GET \'/<url>\' serves a page', assert => {
        assert.expect(11);
        const req = webApp.makeRequest('/', 'GET');
        const handlePageRequestFn = webApp.getHandler(req.url, req.method);
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'send');
        //
        handlePageRequestFn(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.ok(body.indexOf('<title>Hello home') > -1,
            'should serve "/home" using home-layout.jsx.htm');
        assert.ok(body.indexOf('<p>'+homeContentCnt.json.content) > -1,
            'should render { mainContent.content }');
        assert.ok(body.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        handlePageRequestFn(webApp.makeRequest('/page2', 'GET'), res);
        assert.equal(sendRespSpy.callInfo[1][0], 200);
        const body2 = sendRespSpy.callInfo[1][1];
        assert.ok(body2.indexOf('<title>Hello page') > -1,
            'should serve "/page2" using page-layout.jsx.htm');
        assert.ok(body2.indexOf('<p>'+page2ContentCnt.json.content) > -1,
            'should render { mainContent.content }');
        assert.ok(body2.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        handlePageRequestFn(webApp.makeRequest('/404', 'GET'), res);
        assert.equal(sendRespSpy.callInfo[2][0], 404);
        const body3 = sendRespSpy.callInfo[2][1];
        assert.ok(body3.indexOf('Not found') > -1, 'should contain "Not found"');
        assert.ok(body3.indexOf('<iframe') > -1, 'should contain "<iframe"');
    });
    QUnit.test('GET \'/<url>\' embeds info about the page in <script>', assert => {
        assert.expect(4);
        const req = webApp.makeRequest('/home', 'GET');
        const res = webApp.makeResponse();
        const handlePageRequestFn = webApp.getHandler(req.url, req.method);
        const sendRespSpy = new Stub(res, 'send');
        //
        handlePageRequestFn(req, res);
        const body = sendRespSpy.callInfo[0][1];
        const pcs = body.split('function getCurrentPageData(){return ');
        assert.ok(pcs.length == 2, 'Should contain getCurrentPageData() declaration');
        const expectedPageData = JSON.stringify({
            directiveElems:[],
            allContentNodes:[{content:'Hello',defaults:{id:1,name:'home',dataBatchConfigId:1}}],
            page:{url:req.url,layoutFileName:layout1.fileName}
        });
        const actualPageData = pcs[1] ? pcs[1].substr(0, expectedPageData.length) : '';
        assert.equal(actualPageData, expectedPageData);
        //
        handlePageRequestFn(webApp.makeRequest('/404', 'GET'), res);
        const body2 = sendRespSpy.callInfo[1][1];
        const pcs2 = body2.split('function getCurrentPageData(){return ');
        assert.ok(pcs2.length == 2, 'Should contain getCurrentPageData() declaration');
        const expectedPageData2 = JSON.stringify({directiveElems:[],allContentNodes:[],page:{}});
        const actualPageData2 = pcs2[1] ? pcs2[1].substr(0, expectedPageData2.length) : '';
        assert.equal(actualPageData2, expectedPageData2);
    });
    QUnit.test('GET \'/api/websites/current/waiting-uploads\'', assert => {
        assert.expect(9);
        //
        const sql = 'update uploadStatuses set `curhash`= ?, `uphash` = ? where `url`= ?';
        if (
            website.db.prepare(sql).run('different-hash', 'same-hash', pages[1].url) < 1 ||
            website.db.prepare(sql).run('same-hash', 'same-hash', pages[2].url) < 1 ||
            website.db.prepare(sql).run('same-hash', 'same-hash', '/foo.css') < 1
        ) throw new Error('Failed to setup test data.');
        //
        const req = webApp.makeRequest('/api/websites/current/waiting-uploads', 'GET');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, resp] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.equal(resp.pages[0].url, pages[0].url);
        assert.equal(resp.pages[1].url, pages[1].url);
        assert.ok(resp.pages[2] === undefined, 'shouldn\'t return uploaded pages');
        assert.equal(resp.pages[0].uploadStatus, UploadStatus.NOT_UPLOADED);
        assert.equal(resp.pages[1].uploadStatus, UploadStatus.OUTDATED);
        assert.equal(resp.files[0].url, '/bar.js');
        assert.ok(resp.files[1] === undefined, 'Shouldn\'t return uploaded files');
        assert.equal(resp.files[0].uploadStatus, UploadStatus.NOT_UPLOADED);
        //
        if (website.db.prepare('update uploadStatuses set `uphash` = null')
                      .run().changes < 5) throw new Error('Failed to reset test data.');
    });
    QUnit.test('POST \'/api/websites/current/generate\' generates the site', assert => {
        assert.expect(16);
        const existsStub = new Stub(website.fs, 'existsSync');
        const makeDirStub = new Stub(website.fs, 'mkdirSync');
        const writeFileStub = new Stub(website.fs, 'writeFileSync');
        const req = webApp.makeRequest('/api/websites/current/generate', 'POST');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.equal(body.wrotePagesNum, 3);
        assert.equal(body.totalPages, website.graph.pageCount);
        assert.equal(body.outPath, website.dirPath + 'out');
        assert.equal(body.issues.length, 0);
        assert.equal(makeDirStub.callInfo.length, 3, 'should make dirs for all pages');
        assert.equal(makeDirStub.callInfo[0][0], website.dirPath+'out/home');
        assert.equal(makeDirStub.callInfo[1][0], website.dirPath+'out/page2');
        assert.equal(makeDirStub.callInfo[2][0], website.dirPath+'out/page3');
        assert.equal(writeFileStub.callInfo.length, 3, 'should write all pages to /out');
        assert.equal(writeFileStub.callInfo[0][0], website.dirPath+'out/home/index.html');
        assert.equal(writeFileStub.callInfo[1][0], website.dirPath+'out/page2/index.html');
        assert.equal(writeFileStub.callInfo[2][0], website.dirPath+'out/page3/index.html');
        assert.ok(writeFileStub.callInfo[0][1].indexOf('<p>'+homeContentCnt.json.content) > -1,
            'should write the contents of \'/home\'');
        assert.ok(writeFileStub.callInfo[1][1].indexOf('<p>'+page2ContentCnt.json.content) > -1,
            'should write the contents of \'/page2\'');
        assert.ok(writeFileStub.callInfo[2][1].indexOf('<p>'+page3ContentCnt.json.content) > -1,
            'should write the contents of \'/page3\'');
        //
        existsStub.restore();
        makeDirStub.restore();
        writeFileStub.restore();
    });
    QUnit.test('POST \'/api/websites/current/upload\' uploads pages and files', assert => {
        assert.expect(11);
        const res = webApp.makeResponse();
        const ftpConnectStub = new Stub(website.uploader, 'open',
            () => Promise.resolve(null));
        const ftpUploadStub = new Stub(website.uploader, 'upload',
            () => Promise.resolve({code: FTPResponseCode.TRANSFER_COMPLETE}));
        const chunkWriteSpy = new Stub(res, 'writeChunk');
        const sha1Stub = new Stub(diff, 'sha1', str => str);
        //
        const req = webApp.makeRequest('/api/websites/current/upload', 'POST',
            {remoteUrl: 'ftp://ftp.site.net/',
             username: 'ftp@mysite.net',
             password: 'bar', pageUrls: [
                 {url: pages[0].url, isDeleted: 0},
                 {url: pages[1].url, isDeleted: 0},
                 {url: pages[2].url, isDeleted: 0},
             ], fileNames: [
                 {fileName: mockFileNames[0], isDeleted: 0},
                 {fileName: mockFileNames[1], isDeleted: 0}
             ]});
        //
        const done = assert.async();
        webApp.getHandler(req.url, req.method)(req, res).then(() => {
            assert.deepEqual(ftpConnectStub.callInfo[0],
                {'0': req.data.remoteUrl.substr(0, req.data.remoteUrl.length - 1),
                 '1': req.data.username, '2': req.data.password},
                'should pass req.data.username&pass to currentWebsite.uploader.open()');
            //
            const chunk1 = chunkWriteSpy.callInfo[0][0];
            assert.equal(chunk1, 'file|' + req.data.fileNames[0].fileName + '|ok|');
            assert.deepEqual(ftpUploadStub.callInfo[0], {
                '0': req.data.fileNames[0].fileName,
                '1': mockFiles[req.data.fileNames[0].fileName]
            });
            const chunk2 = chunkWriteSpy.callInfo[1][0];
            assert.equal(chunk2, 'file|' + req.data.fileNames[1].fileName + '|ok|');
            assert.deepEqual(ftpUploadStub.callInfo[1], {
                '0': req.data.fileNames[1].fileName,
                '1': mockFiles[req.data.fileNames[1].fileName]
            });
            //
            const generatedHtmls = [];
            website.generate((renderedOutput) => {
                generatedHtmls.push(renderedOutput);
            }, null, {
                [req.data.pageUrls[0].url]: 1,
                [req.data.pageUrls[1].url]: 1,
                [req.data.pageUrls[2].url]: 1
            });
            const chunk3 = chunkWriteSpy.callInfo[2][0];
            assert.equal(chunk3, 'page|' + req.data.pageUrls[0].url + '|ok|');
            assert.deepEqual(ftpUploadStub.callInfo[2], {
                '0': req.data.pageUrls[0].url+'/index.html',
                '1': generatedHtmls[0],
            });
            const chunk4 = chunkWriteSpy.callInfo[3][0];
            assert.equal(chunk4, 'page|' + req.data.pageUrls[1].url + '|ok|');
            assert.deepEqual(ftpUploadStub.callInfo[3], {
                '0': req.data.pageUrls[1].url+'/index.html',
                '1': generatedHtmls[1],
            });
            const chunk5 = chunkWriteSpy.callInfo[4][0];
            assert.equal(chunk5, 'page|' + req.data.pageUrls[2].url + '|ok|');
            assert.deepEqual(ftpUploadStub.callInfo[4], {
                '0': req.data.pageUrls[2].url+'/index.html',
                '1': generatedHtmls[2],
            });
            //
            ftpConnectStub.restore();
            ftpUploadStub.restore();
            sha1Stub.restore();
            if (website.db.prepare('update uploadStatuses set `uphash` = null')
                          .run().changes < 5) throw new Error('Failed to reset test data.');
            done();
        });
    });
    QUnit.test('POST \'/api/websites/current/upload\' updates uploadStatuses', assert => {
        assert.expect(2);
        const res = webApp.makeResponse();
        const ftpConnectStub = new Stub(website.uploader, 'open',
            () => Promise.resolve(null));
        const ftpUploadStub = new Stub(website.uploader, 'upload',
            () => Promise.resolve({code: FTPResponseCode.TRANSFER_COMPLETE}));
        const sha1Stub = new Stub(diff, 'sha1', str => str);
        //
        const req = webApp.makeRequest('/api/websites/current/upload', 'POST',
            {remoteUrl: 'ftp://ftp.site.net', username: 'ftp@mysite.net',
             password: 'bar',
             pageUrls: [{url: pages[0].url, isDeleted: 0}],
             fileNames: [{fileName: mockFileNames[0], isDeleted: 0}]});
        //
        const done = assert.async();
        webApp.getHandler(req.url, req.method)(req, res).then(() => {
            const assertSetStatusToUploaded = (url, expectedUphash, id) => {
                assert.equal(website.db
                    .prepare('select `uphash` from uploadStatuses where `url` = ?')
                    .get(url).uphash, expectedUphash, 'should update uphash of ' + id);
            };
            assertSetStatusToUploaded(mockFileNames[0],
                diff.sha1(mockFiles[mockFileNames[0]]), 'file #1');
            assertSetStatusToUploaded(page1.url,
                diff.sha1(website.renderPage(page1, null, null)), 'page #1');
            //
            ftpConnectStub.restore();
            ftpUploadStub.restore();
            sha1Stub.restore();
            if (website.db.prepare('update uploadStatuses set `uphash` = null')
                          .run().changes < 2) throw new Error('Failed to reset test data.');
            done();
        });
    });
    QUnit.test('POST \'/api/websites/current/upload\' deletes pages and files', assert => {
        assert.expect(4);
        const inputPageUrls = [pages[2].url];
        const inputFileNames = [mockFileNames[1]];
        const res = webApp.makeResponse();
        //
        const ftpConnectStub = new Stub(website.uploader, 'open',
            () => Promise.resolve(null));
        const ftpDeleteStub = new Stub(website.uploader, 'delete',
            () => Promise.resolve({code: FTPResponseCode.TRANSFER_COMPLETE}));
        if (website.db.prepare('update uploadStatuses set `curhash` = null,\
                               `uphash` = \'up\' where `url` in (?,?)')
                      .run(inputPageUrls[0], inputFileNames[0]).changes < 2)
            throw new Error('Failed to setup test data.');
        //
        const req = webApp.makeRequest('/api/websites/current/upload', 'POST',
            {remoteUrl: 'ftp://ftp.site.net/dir',
             username: 'ftp@mysite.net',
             password: 'bar',
             pageUrls: [{url: inputPageUrls[0], isDeleted: 1}],
             fileNames: [{fileName: inputFileNames[0], isDeleted: 1}]});
        //
        const done = assert.async();
        webApp.getHandler(req.url, req.method)(req, res).then(() => {
            const assertWipedStatus = (url, id) => {
                const q = 'select count(`url`) as c from uploadStatuses where `url` = ?';
                assert.equal(website.db.prepare(q).get(url).c, 0,
                    'should delete ' + id + ' from uploadStatuses');
            };
            assert.deepEqual(ftpDeleteStub.callInfo[0],
                {'0': inputPageUrls[0]+'/index.html', '1': true},
                'Should delete the page first');
            assertWipedStatus(inputPageUrls[0], 'page #1');
            assert.deepEqual(ftpDeleteStub.callInfo[1],
                {'0': inputFileNames[0], '1': false},
                'Should delete the file');
            assertWipedStatus(inputFileNames[0], 'file #1');
            //
            ftpConnectStub.restore();
            ftpDeleteStub.restore();
            if (website.db.prepare('insert into uploadStatuses values '+q+','+q).run(
                    inputPageUrls[0], '', null, 0, inputFileNames[0], '', null, 1
                ).changes < 1) throw new Error('Failed to reset test data.');
            done();
        });
    });
    QUnit.test('PUT \'/api/websites/current/page\' updates a page', assert => {
        assert.expect(3);
        //
        const req = webApp.makeRequest('/api/websites/current/page', 'PUT',
            {url: '/page2', layoutFileName: layout1.fileName});
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.equal(JSON.stringify(body), '{"numAffectedRows":1}');
        // Assert that changed layoutFileName and saved the changes to the database
        const row = website.db.prepare('select `graph` from self limit 1').get();
        const updatedPData = JSON.parse(row.graph).pages; // [[<url>,<parent>,<layoutFilename>...]]
        const entry = updatedPData.find(ir => ir[0] === req.data.url);
        assert.equal(entry ? entry[2] : 'nil', layout1.fileName);
    });
    QUnit.test('PUT \'/api/websites/current/site-graph\' deletes pages', assert => {
        assert.expect(8);
        //
        const url1 = '/services';
        const url2 = '/contact';
        siteGraph.addPage(url1, '', layout1.fileName, {}, 1);
        siteGraph.addPage(url2, '', layout1.fileName, {}, 1);
        if (website.db.prepare('insert into uploadStatuses values '+q+','+q).run(
                url1, 'hash', 'hash', 1,
                //               ^ /services2 is uploaded
                url2, 'hash', null, 1
                //              ^ /contact2 is not
            ).changes < 1 || website.saveToDb(siteGraph) < 1)
            throw new Error('Failed to setup test data.');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        const req = webApp.makeRequest('/api/websites/current/site-graph', 'PUT',
            {deleted: [url1, url2]});
        // Emulate the request
        webApp.getHandler(req.url, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.equal(JSON.stringify(body), '{"status":"ok"}');
        //
        assert.ok(siteGraph.getPage(url1) === undefined,
            'Should remove /services2 from the site graph');
        assert.ok(siteGraph.getPage(url2) === undefined,
            'Should remove /contact2 from the site graph');
        // Assert that updated self
        const row = website.db.prepare('select `graph` from self limit 1').get();
        const updatedPData = JSON.parse(row.graph).pages;
        assert.ok(updatedPData.find(ir => ir[0] === url1) == null,
            'Should remove /services2 from the stored site graph');
        assert.ok(updatedPData.find(ir => ir[0] === url2) == null,
            'Should remove /contact2 from the stored site graph');
        // Assert that updated uploadStatuses
        const statuses = website.db
            .prepare('select `url`,`curhash`,`uphash` from uploadStatuses where `url` in (?,?)')
            .all(url1, url2);
        assert.deepEqual(statuses[0], {url: url1, curhash: null, uphash: 'hash'},
            'Should mark /services2 as removed');
        assert.ok(statuses[1] === undefined,
            'Should delete the uploadStatus of /contact2 completely');
    });
});
