require('website-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var website = require('website.js');
var siteGraph = website.siteGraph;
var http = require('http.js');
var UPLOAD_OK = commons.UploaderStatus.UPLOAD_OK;

testLib.module('website-handlers.js', function(hooks) {
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
    hooks.before(function() {
        website.siteConfig.homeUrl = pages[0].url;
        layout1 = siteGraph.addTemplate('home-layout.jsx.htm', true, true);
        layout2 = siteGraph.addTemplate('page-layout.jsx.htm', true, true);
        page1 = siteGraph.addPage(pages[0].url, '', layout1.fileName, {}, 1);
        page2 = siteGraph.addPage(pages[1].url, '', layout2.fileName, {}, 1);
        page3 = siteGraph.addPage(pages[2].url, '', layout2.fileName, {}, 1);
        website.website.compileAndCacheTemplate(layout1.fileName);
        website.website.compileAndCacheTemplate(layout2.fileName);
        var q = '(?,?,?,?)';
        var sql2 = 'insert into contentNodes values '+q+','+q+','+q;
        var sql3 = 'insert into uploadStatuses values '+q+','+q+','+q+','+q+','+q;
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
                stmt.bindInt(0, testWebsite.id);
                stmt.bindString(1, siteGraph.serialize());
            }) < 1 ||
            commons.db.insert(sql2, function(stmt) {
                [homeContentCnt,page2ContentCnt,page3ContentCnt].forEach(function(c, i) {
                    stmt.bindInt(i*4, i+1);
                    stmt.bindString(i*4+1, c.name);
                    stmt.bindString(i*4+2, JSON.stringify(c.json));
                    stmt.bindString(i*4+3, c.contentTypeName);
                });
            }) < 1 ||
            commons.db.insert(sql3, function(stmt) {
                Object.keys(mockFiles).concat(page1, page2, page3).forEach(function(item, i) {
                    stmt.bindString(i*4, i < 2 ? item : item.url);
                    stmt.bindString(i*4+1, '');         // curhash
                    stmt.bindInt(i*4+2, null);          // uphash
                    stmt.bindInt(i*4+3, i < 2 ? 1 : 0); // isFile
                });
            }) < 1
        ) throw new Error('Failed to insert test data.');
        //
        website.website.fs = {
            write: function(a,b) { writeLog.push({path:a,contents:b}); return true; },
            read: function(fpath) { return mockFiles[fpath.replace(insnEnv.sitePath,'')]; },
            makeDirs: function(a) { makeDirsLog.push({path:a}); return true; }
        };
        website.website.crypto = {sha1: function(str) { return str; }};
    });
    hooks.after(function() {
        website.website.fs = commons.fs;
        website.website.crypto = require('crypto.js');
        website.siteGraph.clear();
        if (commons.db.delete('delete from contentNodes where contentTypeName = ?',
                function(stmt) { stmt.bindString(0, genericCntType.name); }) < 1 ||
            commons.db.delete('delete from websites where id = ?',
                function(stmt) { stmt.bindInt(0, testWebsite.id); }) < 1 ||
            commons.db.delete('delete from uploadStatuses', function() { }) < 4 ||
            commons.db.delete('delete from staticFileResources', function() { }) < 2
        ) throw new Error('Failed to clean test data.');
    });
    hooks.afterEach(function() {
        writeLog = [];
        makeDirsLog = [];
    });
    testLib.test('GET \'/<url>\' serves a page', function(assert) {
        assert.expect(11);
        var req = new http.Request('/', 'GET');
        var handlePageRequestFn = commons.app.getHandler(req.url, req.method);
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
        var handlePageRequestFn = commons.app.getHandler(req.url, req.method);
        //
        var response = handlePageRequestFn(req);
        var pcs = response.body.split('function getCurrentPageData() { return ');
        assert.ok(pcs.length == 2, 'Should contain getCurrentPageData() declaration');
        var expectedPageData = JSON.stringify({
            directiveInstances:[],
            allContentNodes:[{content:'Hello',defaults:{id:1,name:'home',dataBatchConfigId:1}}],
            page:{url:req.url,layoutFileName:layout1.fileName}
        });
        var actualPageData = pcs[1] ? pcs[1].substr(0, expectedPageData.length) : '';
        assert.equal(actualPageData, expectedPageData);
        //
        var response2 = handlePageRequestFn(new http.Request('/404', 'GET'));
        var pcs2 = response2.body.split('function getCurrentPageData() { return ');
        assert.ok(pcs2.length == 2, 'Should contain getCurrentPageData() declaration');
        var expectedPageData2 = JSON.stringify({directiveInstances:[],allContentNodes:[],page:{}});
        var actualPageData2 = pcs2[1] ? pcs2[1].substr(0, expectedPageData2.length) : '';
        assert.equal(actualPageData2, expectedPageData2);
    });
    testLib.test('GET \'/api/website/waiting-uploads\'', function(assert) {
        assert.expect(10);
        //
        var sql = 'update uploadStatuses set `curhash`= ?, `uphash` = ? where `url`= ?';
        if (
            commons.db.update(sql, function(stmt) {
                stmt.bindString(0, 'different-hash');
                stmt.bindString(1, 'same-hash');
                stmt.bindString(2, pages[1].url);
            }) < 1 ||
            commons.db.update(sql, function(stmt) {
                stmt.bindString(0, 'same-hash');
                stmt.bindString(1, 'same-hash');
                stmt.bindString(2, pages[2].url);
            }) < 1 ||
            commons.db.update(sql, function(stmt) {
                stmt.bindString(0, 'same-hash');
                stmt.bindString(1, 'same-hash');
                stmt.bindString(2, fileNames[0]);
            }) < 1
        ) throw new Error('Failed to setup test data.');
        //
        var req = new http.Request('/api/website/waiting-uploads', 'GET');
        var response = commons.app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        var resp = JSON.parse(response.body);
        assert.equal(response.headers['Content-Type'], 'application/json');
        assert.equal(resp.pages[0].url, pages[0].url);
        assert.equal(resp.pages[1].url, pages[1].url);
        assert.ok(resp.pages[2] === undefined, 'shouldn\'t return uploaded pages');
        assert.equal(resp.pages[0].uploadStatus, website.NOT_UPLOADED);
        assert.equal(resp.pages[1].uploadStatus, website.OUTDATED);
        assert.equal(resp.files[0].url, fileNames[1]);
        assert.ok(resp.files[1] === undefined, 'Shouldn\'t return uploaded files');
        assert.equal(resp.files[0].uploadStatus, website.NOT_UPLOADED);
        //
        if (commons.db.update('update uploadStatuses set `uphash` = null',
            function() {}) < 5) throw new Error('Failed to reset test data.');
    });
    testLib.test('POST \'/api/website/generate\' generates the site', function(assert) {
        assert.expect(16);
        //
        var req = new http.Request('/api/website/generate', 'POST');
        //
        var response = commons.app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        var body = JSON.parse(response.body);
        assert.equal(body.wrotePagesNum, 3);
        assert.equal(body.totalPages, website.siteGraph.pageCount);
        assert.equal(body.outPath, insnEnv.sitePath + 'out');
        assert.equal(body.issues.length, 0);
        assert.equal(makeDirsLog.length, 3, 'should make dirs for all pages');
        assert.equal(makeDirsLog[0].path, insnEnv.sitePath+'out/home');
        assert.equal(makeDirsLog[1].path, insnEnv.sitePath+'out/page2');
        assert.equal(makeDirsLog[2].path, insnEnv.sitePath+'out/page3');
        assert.equal(writeLog.length, 3, 'should write all pages to /out');
        assert.equal(writeLog[0].path, insnEnv.sitePath+'out/home/index.html');
        assert.equal(writeLog[1].path, insnEnv.sitePath+'out/page2/index.html');
        assert.equal(writeLog[2].path, insnEnv.sitePath+'out/page3/index.html');
        assert.ok(writeLog[0].contents.indexOf('<p>'+homeContentCnt.json.content) > -1,
            'should write the contents of \'/home\'');
        assert.ok(writeLog[1].contents.indexOf('<p>'+page2ContentCnt.json.content) > -1,
            'should write the contents of \'/page2\'');
        assert.ok(writeLog[2].contents.indexOf('<p>'+page3ContentCnt.json.content) > -1,
            'should write the contents of \'/page3\'');
    });
    testLib.test('POST \'/api/website/upload\' uploads pages and files', function(assert) {
        assert.expect(20);
        var uploaderCredentials = {};
        var uploadLog = [];
        website.website.Uploader = function(a,b) {
            uploaderCredentials = {username: a, password: b};
            this.uploadString = function(a,b) { uploadLog.push({url:a,contents:b});return UPLOAD_OK; };
        };
        //
        var req = new http.Request('/api/website/upload', 'POST');
        req.data = {remoteUrl: 'ftp://ftp.site.net/', username: 'ftp@mysite.net',
                    password: 'bar', 'pageUrls[0]': pages[0].url,
                    'pageUrls[1]': pages[1].url, 'pageUrls[2]': pages[2].url,
                    'fileNames[0]': fileNames[0], 'fileNames[1]': fileNames[1]};
        //
        var response = commons.app.getHandler(req.url, req.method)(req);
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
        assert.equal(chunk1, 'file|' + req.data['fileNames[0]'] + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 1, 'should upload file #1');
        assert.deepEqual(uploadLog[0], {
            url: remUrl+req.data['fileNames[0]'],
            contents: mockFiles[req.data['fileNames[0]']]
        });
        var chunk2 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk2, 'file|' + req.data['fileNames[1]'] + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 2, 'should upload file #2');
        assert.deepEqual(uploadLog[1], {
            url: remUrl+req.data['fileNames[1]'],
            contents: mockFiles[req.data['fileNames[1]']]
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
        website.website.Uploader = commons.Uploader;
        if (commons.db.update('update uploadStatuses set `uphash` = null',
            function() {}) < 5) throw new Error('Failed to reset test data.');
    });
    testLib.test('POST \'/api/website/upload\' updates uploadStatuses', function(assert) {
        assert.expect(3);
        website.website.Uploader = function() {};
        website.website.Uploader.prototype.uploadString = function() {};
        //
        var req = new http.Request('/api/website/upload', 'POST');
        req.data = {remoteUrl: 'ftp://ftp.site.net', username: 'ftp@mysite.net',
                    password: 'bar', 'pageUrls[0]': pages[0].url,
                    'fileNames[0]': fileNames[0]};
        //
        var response = commons.app.getHandler(req.url, req.method)(req);
        var assertSetStatusToUploaded = function(expected, id) {
            commons.db.select('select `uphash` from uploadStatuses where `url` = ?',
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
        website.website.Uploader = commons.Uploader;
    });
    testLib.test('PUT \'/api/website/page\' updates a page', function(assert) {
        assert.expect(3);
        //
        var req = new http.Request('/api/website/page', 'PUT');
        // Emulate the request
        req.data = {url: '/page2', layoutFileName: layout1.fileName};
        var response = commons.app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"numAffectedRows":1}');
        // Assert that changed layoutFileName and saved the changes to the database
        commons.db.select('select `graph` from websites limit 1', function(row) {
            var updatedPData = JSON.parse(row.getString(0)).pages; // [[<url>,<parent>,<layoutFilename>...]]
            var savedFileName = null;
            for (var i = 0; i < updatedPData.length; ++i) {
                if (updatedPData[i][0] == req.data.url) { savedFileName = updatedPData[i][2]; break; }
            }
            assert.equal(savedFileName, layout1.fileName);
        });
    });
});