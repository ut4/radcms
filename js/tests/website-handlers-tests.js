require('website-handlers.js').init();
var app = require('app.js').app;
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var http = require('http.js');
var websiteModule = require('website.js');
var UPLOAD_OK = commons.UploaderStatus.UPLOAD_OK;
var q = '(?,?,?,?)';

testLib.module('website-handlers.js (1)', function() {
    var resetDb = function() {
        if (app.db.delete('delete from websites', function() {
            //
        }) < 1) throw new Error('Failed to clean test data.');
    };
    testLib.test('GET \'/api/websites\' lists all websites', function(assert) {
        assert.expect(5);
        //
        var ancientUnixTime = 2;
        var testSites = [
            {id: 23, dirPath: 'a/a/', name: 'a.com'},
            {id: 64, dirPath: 'b/b/', name: null}
        ];
        if (app.db.insert('insert into websites (`id`,`dirPath`,`name`) values \
                          (?,?,?),(?,?,?)', function(stmt) {
                testSites.forEach(function(testSite, i) {
                    stmt.bindInt(i*3, testSite.id);
                    stmt.bindString(i*3+1, testSite.dirPath);
                    stmt.bindString(i*3+2, testSite.name);
                });
            }) < 1) throw new Error('Failed to insert test data');
        //
        var req = new http.Request('/api/websites', 'GET');
        var response = app.getHandler(req.url, req.method)(req);
        //
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['Content-Type'], 'application/json');
        var actual = JSON.parse(response.body);
        assert.ok(actual[0].createdAt > ancientUnixTime, 'Should set default createdAt #1');
        assert.ok(actual[1].createdAt > ancientUnixTime, 'Should set default createdAt #2');
        delete actual[0].createdAt;
        delete actual[1].createdAt;
        assert.deepEqual(actual, testSites);
        //
        resetDb();
    });
    testLib.test('POST \'/api/websites\' creates a new website', function(assert) {
        assert.expect(7);
        var stub1 = new Stub(app, 'setWaitingWebsite', function(dirPath) {
            app.waitingWebsite = new websiteModule.Website(dirPath, ':memory:');
        });
        var stub2 = new Stub(websiteModule.Website.prototype, 'install', function() {});
        //
        var inputDirPath = '/test/path';
        var inputWebsiteName = 'mysite.com';
        var req = new http.Request('/api/websites', 'POST');
        req.data = {dirPath: inputDirPath, sampleDataName: 'minimal',
                    name: inputWebsiteName};
        //
        var response = app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"status":"ok"}');
        assert.equal(response.headers['Content-Type'], 'application/json');
        assert.equal(stub1.callInfo[0][0], inputDirPath + '/',
            'Should call setWaitingWebsite($req.data.dirPath)');
        assert.equal(stub2.callInfo[0][0], req.data.sampleDataName,
            'Should call app.currentWebsite.install($req.data.sampleDataName)');
        app.db.select('select `dirPath`,`name` from websites', function(row) {
            assert.equal(row.getString(0), inputDirPath + '/');
            assert.equal(row.getString(1), inputWebsiteName);
        });
        //
        stub1.restore();
        stub2.restore();
        resetDb();
    });
    testLib.test('PUT \'/api/websites/set-current\'', function(assert) {
        assert.expect(4);
        var stub1 = new Stub(app, 'setCurrentWebsite', function() {});
        //
        var inputDirPath = '/test/path/to/my/site';
        var req = new http.Request('/api/websites/set-current', 'PUT');
        req.data = {dirPath: inputDirPath};
        //
        var response = app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"status":"ok"}');
        assert.equal(response.headers['Content-Type'], 'application/json');
        assert.equal(stub1.callInfo[0][0], inputDirPath + '/',
            'Should call setCurrentWebsite($req.data.dirPath)');
        //
        stub1.restore();
    });
});

testLib.module('website-handlers.js (2)', function(hooks) {
    var genericCntType = {id:1,name:'Generic',fields:'{"content":"richtext"}'};
    var homeContentCnt = {name:'home',json:{content:'Hello'},contentTypeName:'Generic'};
    var page2ContentCnt = {name:'/page2',json:{content:'Page2'},contentTypeName:'Generic'};
    var page3ContentCnt = {name:'/page3',json:{content:'Page3'},contentTypeName:'Generic'};
    var mockFiles = {'/foo.css': 'p {}', '/bar.js': 'var p;'};
    var fileNames = Object.keys(mockFiles);
    var pages = [{url:'/home'}, {url:'/page2'}, {url:'/page3'}];
    var testWebsite = {id: 1};
    var layout1, layout2, page1, page2, page3;
    var writeLog = [];
    var makeDirsLog = [];
    var website;
    var siteGraph;
    hooks.before(function() {
        website = app.currentWebsite;
        siteGraph = website.graph;
        website.config.homeUrl = pages[0].url;
        layout1 = {fileName: 'home-layout.jsx.htm'};
        layout2 = {fileName: 'page-layout.jsx.htm'};
        page1 = siteGraph.addPage(pages[0].url, '', layout1.fileName, {}, 1);
        page2 = siteGraph.addPage(pages[1].url, '', layout2.fileName, {}, 1);
        page3 = siteGraph.addPage(pages[2].url, '', layout2.fileName, {}, 1);
        app.currentWebsite.compileAndCacheTemplate(layout1.fileName);
        app.currentWebsite.compileAndCacheTemplate(layout2.fileName);
        var sql2 = 'insert into contentNodes values '+q+','+q+','+q;
        var sql3 = 'insert into uploadStatuses values '+q+','+q+','+q+','+q+','+q;
        var sql4 = 'insert into staticFileResources values (?,1),(?,1)';
        if (website.db.insert('insert into self values (?,?)', function(stmt) {
                stmt.bindInt(0, testWebsite.id);
                stmt.bindString(1, siteGraph.serialize());
            }) < 1 ||
            website.db.insert(sql2, function(stmt) {
                [homeContentCnt,page2ContentCnt,page3ContentCnt].forEach(function(c, i) {
                    stmt.bindInt(i*4, i+1);
                    stmt.bindString(i*4+1, c.name);
                    stmt.bindString(i*4+2, JSON.stringify(c.json));
                    stmt.bindString(i*4+3, c.contentTypeName);
                });
            }) < 1 ||
            website.db.insert(sql3, function(stmt) {
                Object.keys(mockFiles).concat(page1, page2, page3).forEach(function(item, i) {
                    stmt.bindString(i*4, i < 2 ? item : item.url);
                    stmt.bindString(i*4+1, '');         // curhash
                    stmt.bindInt(i*4+2, null);          // uphash
                    stmt.bindInt(i*4+3, i < 2 ? 1 : 0); // isFile
                });
            }) < 1 ||
            website.db.insert(sql4, function(stmt) {
                Object.keys(mockFiles).forEach(function(url, i) {
                    stmt.bindString(i, url);
                });
            }) < 1
        ) throw new Error('Failed to insert test data.');
        //
        app.currentWebsite.fs = {
            write: function(a,b) { writeLog.push({path:a,contents:b}); return true; },
            read: function(fpath) { return mockFiles[fpath.replace(website.dirPath,'')]; },
            makeDirs: function(a) { makeDirsLog.push({path:a}); return true; }
        };
        app.currentWebsite.crypto = {sha1: function(str) { return str; }};
    });
    hooks.after(function() {
        app.currentWebsite.fs = commons.fs;
        app.currentWebsite.crypto = require('crypto.js');
        website.graph.clear();
        if (website.db.delete('delete from contentNodes where contentTypeName = ?',
                function(stmt) { stmt.bindString(0, genericCntType.name); }) < 1 ||
            website.db.delete('delete from self where id = ?',
                function(stmt) { stmt.bindInt(0, testWebsite.id); }) < 1 ||
            website.db.delete('delete from uploadStatuses', function() { }) < 5
        ) throw new Error('Failed to clean test data.');
    });
    hooks.afterEach(function() {
        writeLog = [];
        makeDirsLog = [];
    });
    testLib.test('GET \'/<url>\' serves a page', function(assert) {
        assert.expect(11);
        var req = new http.Request('/', 'GET');
        var handlePageRequestFn = app.getHandler(req.url, req.method);
        //
        var response = handlePageRequestFn(req);
        assert.equal(response.statusCode, 200);
        assert.ok(response.body.indexOf('<title>Hello home') > -1,
            'should serve js/tests/testsite/home-layout.jsx.htm');
        assert.ok(response.body.indexOf('<p>'+homeContentCnt.json.content) > -1,
            'should render { mainContent.content }');
        assert.ok(response.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        var response2 = handlePageRequestFn(new http.Request('/page2', 'GET'));
        assert.equal(response2.statusCode, 200);
        assert.ok(response2.body.indexOf('<title>Hello page') > -1,
            'should serve js/tests/testsite/page-layout.jsx.htm');
        assert.ok(response2.body.indexOf('<p>'+page2ContentCnt.json.content) > -1,
            'should render { mainContent.content }');
        assert.ok(response2.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        var response3 = handlePageRequestFn(new http.Request('/404', 'GET'));
        assert.equal(response3.statusCode, 404);
        assert.ok(response3.body.indexOf('Not found') > -1, 'should contain "Not found"');
        assert.ok(response3.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
    });
    testLib.test('GET \'/<url>\' embeds info about the page in <script>', function(assert) {
        assert.expect(4);
        var req = new http.Request('/home', 'GET');
        var handlePageRequestFn = app.getHandler(req.url, req.method);
        //
        var response = handlePageRequestFn(req);
        var pcs = response.body.split('function getCurrentPageData(){return ');
        assert.ok(pcs.length == 2, 'Should contain getCurrentPageData() declaration');
        var expectedPageData = JSON.stringify({
            directiveElems:[],
            allContentNodes:[{content:'Hello',defaults:{id:1,name:'home',dataBatchConfigId:1}}],
            page:{url:req.url,layoutFileName:layout1.fileName}
        });
        var actualPageData = pcs[1] ? pcs[1].substr(0, expectedPageData.length) : '';
        assert.equal(actualPageData, expectedPageData);
        //
        var response2 = handlePageRequestFn(new http.Request('/404', 'GET'));
        var pcs2 = response2.body.split('function getCurrentPageData(){return ');
        assert.ok(pcs2.length == 2, 'Should contain getCurrentPageData() declaration');
        var expectedPageData2 = JSON.stringify({directiveElems:[],allContentNodes:[],page:{}});
        var actualPageData2 = pcs2[1] ? pcs2[1].substr(0, expectedPageData2.length) : '';
        assert.equal(actualPageData2, expectedPageData2);
    });
    testLib.test('GET \'/api/websites/current/waiting-uploads\'', function(assert) {
        assert.expect(10);
        //
        var sql = 'update uploadStatuses set `curhash`= ?, `uphash` = ? where `url`= ?';
        if (
            website.db.update(sql, function(stmt) {
                stmt.bindString(0, 'different-hash');
                stmt.bindString(1, 'same-hash');
                stmt.bindString(2, pages[1].url);
            }) < 1 ||
            website.db.update(sql, function(stmt) {
                stmt.bindString(0, 'same-hash');
                stmt.bindString(1, 'same-hash');
                stmt.bindString(2, pages[2].url);
            }) < 1 ||
            website.db.update(sql, function(stmt) {
                stmt.bindString(0, 'same-hash');
                stmt.bindString(1, 'same-hash');
                stmt.bindString(2, fileNames[0]);
            }) < 1
        ) throw new Error('Failed to setup test data.');
        //
        var req = new http.Request('/api/websites/current/waiting-uploads', 'GET');
        var response = app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        var resp = JSON.parse(response.body);
        assert.equal(response.headers['Content-Type'], 'application/json');
        assert.equal(resp.pages[0].url, pages[0].url);
        assert.equal(resp.pages[1].url, pages[1].url);
        assert.ok(resp.pages[2] === undefined, 'shouldn\'t return uploaded pages');
        assert.equal(resp.pages[0].uploadStatus, websiteModule.NOT_UPLOADED);
        assert.equal(resp.pages[1].uploadStatus, websiteModule.OUTDATED);
        assert.equal(resp.files[0].url, fileNames[1]);
        assert.ok(resp.files[1] === undefined, 'Shouldn\'t return uploaded files');
        assert.equal(resp.files[0].uploadStatus, websiteModule.NOT_UPLOADED);
        //
        if (website.db.update('update uploadStatuses set `uphash` = null',
            function() {}) < 5) throw new Error('Failed to reset test data.');
    });
    testLib.test('POST \'/api/websites/current/generate\' generates the site', function(assert) {
        assert.expect(16);
        //
        var req = new http.Request('/api/websites/current/generate', 'POST');
        //
        var response = app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        var body = JSON.parse(response.body);
        assert.equal(body.wrotePagesNum, 3);
        assert.equal(body.totalPages, website.graph.pageCount);
        assert.equal(body.outPath, website.dirPath + 'out');
        assert.equal(body.issues.length, 0);
        assert.equal(makeDirsLog.length, 3, 'should make dirs for all pages');
        assert.equal(makeDirsLog[0].path, website.dirPath+'out/home');
        assert.equal(makeDirsLog[1].path, website.dirPath+'out/page2');
        assert.equal(makeDirsLog[2].path, website.dirPath+'out/page3');
        assert.equal(writeLog.length, 3, 'should write all pages to /out');
        assert.equal(writeLog[0].path, website.dirPath+'out/home/index.html');
        assert.equal(writeLog[1].path, website.dirPath+'out/page2/index.html');
        assert.equal(writeLog[2].path, website.dirPath+'out/page3/index.html');
        assert.ok(writeLog[0].contents.indexOf('<p>'+homeContentCnt.json.content) > -1,
            'should write the contents of \'/home\'');
        assert.ok(writeLog[1].contents.indexOf('<p>'+page2ContentCnt.json.content) > -1,
            'should write the contents of \'/page2\'');
        assert.ok(writeLog[2].contents.indexOf('<p>'+page3ContentCnt.json.content) > -1,
            'should write the contents of \'/page3\'');
    });
    testLib.test('POST \'/api/websites/current/upload\' uploads pages and files', function(assert) {
        assert.expect(20);
        var uploaderCredentials = {};
        var uploadLog = [];
        app.currentWebsite.Uploader = function(a,b) {
            uploaderCredentials = {username: a, password: b};
            this.uploadString = function(a,b) { uploadLog.push({url:a,contents:b});return UPLOAD_OK; };
        };
        //
        var req = new http.Request('/api/websites/current/upload', 'POST');
        req.data = {remoteUrl: 'ftp://ftp.site.net/', username: 'ftp@mysite.net',
                    password: 'bar', pageUrls: [
                        {url: pages[0].url, isDeleted: 0},
                        {url: pages[1].url, isDeleted: 0},
                        {url: pages[2].url, isDeleted: 0},
                    ], fileNames: [
                        {fileName: fileNames[0], isDeleted: 0},
                        {fileName: fileNames[1], isDeleted: 0}
                    ]};
        //
        var response = app.getHandler(req.url, req.method)(req);
        assert.deepEqual(uploaderCredentials, {username: req.data.username,
            password: req.data.password},
            'should pass req.data.username&pass to new Uploader()');
        assert.ok(response instanceof http.ChunkedResponse,
            'should return new ChunkedResponse()');
        assert.equal(response.statusCode, 200);
        var generatedPages = response.chunkFnState.generatedPages;
        assert.equal(generatedPages.length, 3, 'should generate the pages beforehand');
        // Simulate MHD's MHD_ContentReaderCallback calls
        var chunk1 = response.getNextChunk(response.chunkFnState);
        var remUrl = req.data.remoteUrl.substr(0, req.data.remoteUrl.length -1);
        assert.equal(chunk1, 'file|' + req.data.fileNames[0].fileName + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 1, 'should upload file #1');
        assert.deepEqual(uploadLog[0], {
            url: remUrl+req.data.fileNames[0].fileName,
            contents: mockFiles[req.data.fileNames[0].fileName]
        });
        var chunk2 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk2, 'file|' + req.data.fileNames[1].fileName + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 2, 'should upload file #2');
        assert.deepEqual(uploadLog[1], {
            url: remUrl+req.data.fileNames[1].fileName,
            contents: mockFiles[req.data.fileNames[1].fileName]
        });
        var chunk3 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk3, 'page|' + generatedPages[0].url + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 3, 'should upload page #1');
        assert.deepEqual(uploadLog[2], {
            url: remUrl+generatedPages[0].url+'/index.html',
            contents: generatedPages[0].html,
        });
        var chunk4 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk4, 'page|' + generatedPages[1].url + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 4, 'should upload page #2');
        assert.deepEqual(uploadLog[3], {
            url: remUrl+generatedPages[1].url+'/index.html',
            contents: generatedPages[1].html,
        });
        var chunk5 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk5, 'page|' + generatedPages[2].url + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 5, 'should upload page #3');
        assert.deepEqual(uploadLog[4], {
            url: remUrl+generatedPages[2].url+'/index.html',
            contents: generatedPages[2].html,
        });
        var chunk6 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk6, '');
        //
        app.currentWebsite.Uploader = commons.Uploader;
        if (website.db.update('update uploadStatuses set `uphash` = null',
            function() {}) < 5) throw new Error('Failed to reset test data.');
    });
    testLib.test('POST \'/api/websites/current/upload\' updates uploadStatuses', function(assert) {
        assert.expect(3);
        app.currentWebsite.Uploader = function() {};
        app.currentWebsite.Uploader.prototype.uploadString = function() {};
        //
        var req = new http.Request('/api/websites/current/upload', 'POST');
        req.data = {remoteUrl: 'ftp://ftp.site.net', username: 'ftp@mysite.net',
                    password: 'bar',
                    pageUrls: [{url: pages[0].url, isDeleted: 0}],
                    fileNames: [{fileName: fileNames[0], isDeleted: 0}]};
        //
        var response = app.getHandler(req.url, req.method)(req);
        var assertSetStatusToUploaded = function(expected, id) {
            website.db.select('select `uphash` from uploadStatuses where `url` = ?',
                function(row) {
                    assert.ok(row.getString(0) != null,
                        'should update uphash of ' + id);
                }, function(stmt) {
                    stmt.bindString(0, expected);
                });
        };
        // Simulate MHD's MHD_ContentReaderCallback calls
        response.getNextChunk(response.chunkFnState);
        assertSetStatusToUploaded(fileNames[0], 'file #1');
        response.getNextChunk(response.chunkFnState);
        assertSetStatusToUploaded(page1.url, 'page #1');
        var lastChunk = response.getNextChunk(response.chunkFnState);
        assert.equal(lastChunk, '');
        //
        app.currentWebsite.Uploader = commons.Uploader;
        if (website.db.update('update uploadStatuses set `uphash` = null',
            function() {}) < 2) throw new Error('Failed to reset test data.');
    });
    testLib.test('POST \'/api/websites/current/upload\' deletes pages and files', function(assert) {
        assert.expect(5);
        var uploaderDeleteLog = [];
        var inputPageUrls = [pages[2].url];
        var inputFileNames = [fileNames[1]];
        app.currentWebsite.Uploader = function() {};
        app.currentWebsite.Uploader.prototype.uploadString = function() {};
        app.currentWebsite.Uploader.prototype.delete = function(a, b, c) {
            uploaderDeleteLog.push({serverUrl: a, itemPath: b, asDir: c});
            return UPLOAD_OK;
        };
        if (website.db.update('update uploadStatuses set `curhash` = null,\
                            `uphash` = \'up\' where `url` in (?,?)', function(stmt) {
                stmt.bindString(0, inputPageUrls[0]);
                stmt.bindString(1, inputFileNames[0]);
            }) < 2) throw new Error('Failed to setup test data.');
        //
        var req = new http.Request('/api/websites/current/upload', 'POST');
        req.data = {remoteUrl: 'ftp://ftp.site.net/dir',
                    username: 'ftp@mysite.net',
                    password: 'bar',
                    pageUrls: [{url: inputPageUrls[0], isDeleted: 1}],
                    fileNames: [{fileName: inputFileNames[0], isDeleted: 1}]};
        //
        var response = app.getHandler(req.url, req.method)(req);
        var assertWipedStatus = function(expected, id) {
            website.db.select('select count(`url`) from uploadStatuses where `url` = ?',
                function(row) {
                    assert.equal(row.getInt(0), 0, 'should delete ' + id +
                        ' from uploadStatuses');
                }, function(stmt) {
                    stmt.bindString(0, expected);
                });
        };
        // Simulate MHD's MHD_ContentReaderCallback calls
        response.getNextChunk(response.chunkFnState);
        assert.deepEqual(uploaderDeleteLog[0], {serverUrl: req.data.remoteUrl,
            itemPath: inputPageUrls[0]+'/index.html', asDir: true},
            'Should delete the page first');
        assertWipedStatus(inputPageUrls[0], 'page #1');
        response.getNextChunk(response.chunkFnState);
        assert.deepEqual(uploaderDeleteLog[1], {serverUrl: req.data.remoteUrl,
            itemPath: inputFileNames[0], asDir: false},
            'Should delete the file');
        assertWipedStatus(inputFileNames[0], 'file #1');
        var lastChunk = response.getNextChunk(response.chunkFnState);
        assert.equal(lastChunk, '');
        //
        app.currentWebsite.Uploader = commons.Uploader;
        if (website.db.insert('insert into uploadStatuses values '+q+','+q, function(stmt) {
                stmt.bindString(0, inputPageUrls[0]);
                stmt.bindString(1, '');
                stmt.bindInt(3, 0);
                stmt.bindString(4, inputFileNames[0]);
                stmt.bindString(5, '');
                stmt.bindInt(7, 1);
            }) < 1) throw new Error('Failed to reset test data.');
    });
    testLib.test('PUT \'/api/websites/current/page\' updates a page', function(assert) {
        assert.expect(3);
        //
        var req = new http.Request('/api/websites/current/page', 'PUT');
        // Emulate the request
        req.data = {url: '/page2', layoutFileName: layout1.fileName};
        var response = app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"numAffectedRows":1}');
        // Assert that changed layoutFileName and saved the changes to the database
        website.db.select('select `graph` from self limit 1', function(row) {
            var updatedPData = JSON.parse(row.getString(0)).pages; // [[<url>,<parent>,<layoutFilename>...]]
            var entry = findPage(updatedPData, req.data.url);
            assert.equal(entry ? entry[2] : 'nil', layout1.fileName);
        });
    });
    testLib.test('PUT \'/api/websites/current/site-graph\' deletes pages', function(assert) {
        assert.expect(8);
        //
        var url1 = '/services';
        var url2 = '/contact';
        siteGraph.addPage(url1, '', layout1.fileName, {}, 1);
        siteGraph.addPage(url2, '', layout1.fileName, {}, 1);
        if (website.db.insert('insert into uploadStatuses values '+q+','+q, function(stmt) {
            stmt.bindString(0, url1);
            stmt.bindString(1, 'hash');
            stmt.bindString(2, 'hash'); // /services2 is uploaded
            stmt.bindInt(3, 1);
            stmt.bindString(4, url2);
            stmt.bindString(5, 'hash');
            stmt.bindString(6, null); // /contact2 is not
            stmt.bindInt(7, 1);
        }) < 1 || app.currentWebsite.saveToDb(siteGraph) < 1) {
            throw new Error('Failed to setup test data.');
        }
        var req = new http.Request('/api/websites/current/site-graph', 'PUT');
        // Emulate the request
        req.data = {deleted: [url1, url2]};
        var response = app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"status":"ok"}');
        //
        assert.ok(siteGraph.getPage(url1) === undefined,
            'Should remove /services2 from the site graph');
        assert.ok(siteGraph.getPage(url2) === undefined,
            'Should remove /contact2 from the site graph');
        // Assert that updated self
        website.db.select('select `graph` from self limit 1', function(row) {
            var updatedPData = JSON.parse(row.getString(0)).pages;
            assert.ok(findPage(updatedPData, url1) == null,
                'Should remove /services2 from the stored site graph');
            assert.ok(findPage(updatedPData, url2) == null,
                'Should remove /contact2 from the stored site graph');
        });
        // Assert that updated uploadStatuses
        var statuses = [];
        website.db.select('select `url`,`curhash`,`uphash` from uploadStatuses \
                          where `url` in (?,?)', function(row) {
            statuses.push({url: row.getString(0), curhash: row.getString(1),
                uphash: row.getString(2)});
        }, function(stmt) {
            stmt.bindString(0, url1);
            stmt.bindString(1, url2);
        });
        assert.deepEqual(statuses[0], {url: url1, curhash: null, uphash: 'hash'},
            'Should mark /services2 as removed');
        assert.ok(statuses[1] === undefined,
            'Should delete the uploadStatus of /contact2 completely');
    });
    function findPage(serPages, url) {
        for (var i = 0; i < serPages.length; ++i) {
            if (serPages[i][0] == url) return serPages[i];
        }
        return null;
    }
});

function Stub(obj, method, withFn) {
    this.callInfo = [];
    var orig = obj[method];
    var self = this;
    obj[method] = function() {
        self.callInfo.push(arguments);
        withFn.apply(null, arguments);
    };
    this.restore = function() {
        obj[method] = orig;
    };
}