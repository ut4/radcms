require('website-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var website = require('website.js');
var http = require('http.js');
var LAYOUT_1 = 'home-layout.jsx.htm';
var LAYOUT_2 = 'page-layout.jsx.htm';
var NO_PARENT = '';
var IS_OK = 1;
var IS_IN_USE = 1;

testLib.module('website-handlers.js', function(hooks) {
    var genericCntType = {id:1,name:'Generic',fields:'{"content":"richtext"}'};
    var homeContentCnt = {name:'home',json:{content:'Hello'},contentTypeName:'Generic'};
    var page2ContentCnt = {name:'/page2',json:{content:'Page2'},contentTypeName:'Generic'};
    var page3ContentCnt = {name:'/page3',json:{content:'Page3'},contentTypeName:'Generic'};
    var mockFiles = {'foo.css': 'foo', 'bar.js': 'bar'};
    var websiteData = {id: 1, graph: JSON.stringify({
        pages: [['/home', NO_PARENT, LAYOUT_1, []],
                ['/page2', NO_PARENT, LAYOUT_2, []],
                ['/page3', NO_PARENT, LAYOUT_2, []]],
        templates: [[LAYOUT_1, IS_OK, IS_IN_USE], [LAYOUT_2, IS_OK, IS_IN_USE]]
    })};
    var writeLog = [];
    var makeDirsLog = [];
    hooks.before(function() {
        var sql3 = 'insert into contentNodes values (?,?,?,?),(?,?,?,?),(?,?,?,?)';
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
                stmt.bindInt(0, websiteData.id);
                stmt.bindString(1, websiteData.graph);
            }) < 1 ||
            commons.db.insert(sql3, function(stmt) {
                [homeContentCnt,page2ContentCnt,page3ContentCnt].forEach(function(c, i) {
                    stmt.bindInt(i*4, i+1);
                    stmt.bindString(i*4+1, c.name);
                    stmt.bindString(i*4+2, JSON.stringify(c.json));
                    stmt.bindString(i*4+3, c.contentTypeName);
                });
            }) < 1
        ) throw new Error('Failed to insert test data.');
        website.siteConfig.homeUrl = '/home';
        website.website.config = {loadFromDisk: function() {}};
        // Initializes siteGraph, and reads & caches templates from /js/tests/testsite/
        website.website.init();
        //
        website.website.fs = {
            write: function(a,b) { writeLog.push({path:a,contents:b}); return true; },
            read: function(fpath) { return mockFiles[fpath.replace(insnEnv.sitePath,'')]; },
            makeDirs: function(a) { makeDirsLog.push({path:a}); return true; }
        };
    });
    hooks.after(function() {
        website.website.config = website.siteConfig;
        website.website.fs = commons.fs;
        website.siteGraph.clear();
        if (commons.db.delete('delete from contentNodes where contentTypeName = ?',
                function(stmt) { stmt.bindString(0, genericCntType.name); }) < 1 ||
            commons.db.delete('delete from websites where id = ?',
                function(stmt) { stmt.bindInt(0, websiteData.id); }) < 1
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
            page:{url:req.url,layoutFileName:LAYOUT_1}
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
    testLib.test('POST \'/api/website/generate\' generates the site', function(assert) {
        assert.expect(16);
        //
        var req = new http.Request('/api/website/generate', 'POST');
        var handleGenerateReqFn = commons.app.getHandler(req.url, req.method);
        //
        var response = handleGenerateReqFn(req);
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
    testLib.test('POST \'/api/website/upload\' generates and uploads the site', function(assert) {
        assert.expect(20);
        var uploaderCredentials = {};
        var uploadLog = [];
        var UPLOAD_OK = 0;
        website.website.Uploader = function(a,b) {
            uploaderCredentials = {username: a, password: b};
            this.uploadString = function(a,b) { uploadLog.push({url:a,contents:b});return UPLOAD_OK; };
            this.uploadFile = function(a,b) { uploadLog.push({url:a,localFilePath:b});return UPLOAD_OK; };
        };
        //
        var req = new http.Request('/api/website/upload', 'POST');
        var fileNames = Object.keys(mockFiles);
        req.data = {remoteUrl: 'ftp://ftp.site.net', username: 'ftp@mysite.net',
                    password: 'bar', 'fileNames[0]': fileNames[0],
                    'fileNames[1]': fileNames[1]};
        var handleUploadReqFn = commons.app.getHandler(req.url, req.method);
        //
        var response = handleUploadReqFn(req);
        assert.deepEqual(uploaderCredentials, {username: req.data.username,
            password: req.data.password},
            'should pass req.data.username&pass to new Uploader()');
        assert.ok(response instanceof http.ChunkedResponse,
            'should return new ChunkedResponse()');
        assert.equal(response.statusCode, 200);
        var generatedPages = response.chunkFnState.generatedPages;
        assert.equal(generatedPages.length, 3, 'should generate the site');
        // Simulate MHD's MHD_ContentReaderCallback calls
        var chunk1 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk1, 'file|' + req.data['fileNames[0]'] + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 1, 'should upload file #1');
        assert.deepEqual(uploadLog[0], {
            url: req.data.remoteUrl+'/'+req.data['fileNames[0]'],
            localFilePath: insnEnv.sitePath + req.data['fileNames[0]']
        });
        var chunk2 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk2, 'file|' + req.data['fileNames[1]'] + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 2, 'should upload file #2');
        assert.deepEqual(uploadLog[1], {
            url: req.data.remoteUrl+'/'+req.data['fileNames[1]'],
            localFilePath: insnEnv.sitePath + req.data['fileNames[1]']
        });
        var chunk3 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk3, 'page|' + generatedPages[0].url + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 3, 'should upload page #1');
        assert.deepEqual(uploadLog[2], {
            url: req.data.remoteUrl+generatedPages[0].url+'/index.html',
            contents: generatedPages[0].html,
        });
        var chunk4 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk4, 'page|' + generatedPages[1].url + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 4, 'should upload page #2');
        assert.deepEqual(uploadLog[3], {
            url: req.data.remoteUrl+generatedPages[1].url+'/index.html',
            contents: generatedPages[1].html,
        });
        var chunk5 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk5, 'page|' + generatedPages[2].url + '|' + UPLOAD_OK);
        assert.equal(uploadLog.length, 5, 'should upload page #3');
        assert.deepEqual(uploadLog[4], {
            url: req.data.remoteUrl+generatedPages[2].url+'/index.html',
            contents: generatedPages[2].html,
        });
        var chunk6 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk6, '');
        //
        website.website.Uploader = commons.Uploader;
    });
    testLib.test('PUT \'/api/website/page\' updates a page', function(assert) {
        assert.expect(3);
        //
        var req = new http.Request('/api/website/page', 'PUT');
        var handlePageUpdateReqFn = commons.app.getHandler(req.url, req.method);
        // Emulate the request
        req.data = {url: '/page2', layoutFileName: LAYOUT_1};
        var response = handlePageUpdateReqFn(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"numAffectedRows":1}');
        // Assert that changed layoutFileName and saved the changes to the database
        commons.db.select('select `graph` from websites limit 1', function(row) {
            var updatedPData = JSON.parse(row.getString(0)).pages; // [[<url>,<parent>,<layoutFilename>...]]
            var savedFileName = null;
            for (var i = 0; i < updatedPData.length; ++i) {
                if (updatedPData[i][0] == req.data.url) { savedFileName = updatedPData[i][2]; break; }
            }
            assert.equal(savedFileName, LAYOUT_1);
        });
    });
});