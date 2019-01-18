require('website-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var website = require('website.js');
var http = require('http.js');
var NO_PARENT = 0;
var LAYOUT_0 = 0;
var LAYOUT_1 = 1;

testLib.module('website-handlers.js', function(hooks) {
    var genericCmpType = {id:1,name:'Generic',props:'{"content":"richtext"}'};
    var homeContentCmp = {name:'home',json:{content:'Hello'},componentTypeName:'Generic'};
    var page2ContentCmp = {name:'/page2',json:{content:'Page2'},componentTypeName:'Generic'};
    var page3ContentCmp = {name:'/page3',json:{content:'Page3'},componentTypeName:'Generic'};
    var websiteData = {id: 1, graph: JSON.stringify({
        pages: [['/', NO_PARENT, LAYOUT_0], ['/page2', NO_PARENT, LAYOUT_1],
                ['/page3', NO_PARENT, LAYOUT_1]],
        templates: ['home-layout.jsx.htm', 'page-layout.jsx.htm']
    })};
    var writeLog = [];
    var makeDirsLog = [];
    hooks.before(function() {
        var sql3 = 'insert into components values (?,?,?,?),(?,?,?,?),(?,?,?,?)';
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
                stmt.bindInt(0, websiteData.id);
                stmt.bindString(1, websiteData.graph);
            }) < 1 ||
            commons.db.insert(sql3, function(stmt) {
                [homeContentCmp,page2ContentCmp,page3ContentCmp].forEach(function(cmp, i) {
                    stmt.bindInt(i*4, i+1);
                    stmt.bindString(i*4+1, cmp.name);
                    stmt.bindString(i*4+2, JSON.stringify(cmp.json));
                    stmt.bindString(i*4+3, cmp.componentTypeName);
                });
            }) < 1
        ) throw new Error('Failed to insert test data.');
        website.website.config = {loadFromDisk: function() {}};
        // Initializes siteGraph, and reads & caches templates from /js/tests/testsite/
        website.website.init();
        //
        website.website.fs = {
            write: function(a,b) { writeLog.push({path:a,contents:b}); return true; },
            makeDirs: function(a) { makeDirsLog.push({path:a}); return true; }
        };
    });
    hooks.after(function() {
        website.website.config = website.siteConfig;
        website.website.fs = commons.fs;
        if (commons.db.delete('delete from components where componentTypeName = ?',
                function(stmt) { stmt.bindString(0, genericCmpType.name); }) < 1 ||
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
        assert.ok(response.body.indexOf('<p>'+homeContentCmp.json.content) > -1,
            'should render { mainContent.content }');
        assert.ok(response.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        var response2 = handlePageRequestFn(new http.Request('/page2', 'GET'));
        assert.equal(response2.statusCode, 200);
        assert.ok(response2.body.indexOf('<title>Hello page') > -1,
            'should serve js/tests/testsite/page-layout.jsx.htm');
        assert.ok(response2.body.indexOf('<p>'+page2ContentCmp.json.content) > -1,
            'should render { mainContent.content }');
        assert.ok(response2.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        var response3 = handlePageRequestFn(new http.Request('/404', 'GET'));
        assert.equal(response3.statusCode, 404);
        assert.ok(response3.body.indexOf('Not found') > -1, 'should contain "Not found"');
        assert.ok(response3.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
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
        assert.equal(makeDirsLog[0].path, insnEnv.sitePath+'out/');
        assert.equal(makeDirsLog[1].path, insnEnv.sitePath+'out/page2');
        assert.equal(makeDirsLog[2].path, insnEnv.sitePath+'out/page3');
        assert.equal(writeLog.length, 3, 'should write all pages to /out');
        assert.equal(writeLog[0].path, insnEnv.sitePath+'out/index.html');
        assert.equal(writeLog[1].path, insnEnv.sitePath+'out/page2/index.html');
        assert.equal(writeLog[2].path, insnEnv.sitePath+'out/page3/index.html');
        assert.ok(writeLog[0].contents.indexOf('<p>'+homeContentCmp.json.content) > -1,
            'should write the contents of \'/\'');
        assert.ok(writeLog[1].contents.indexOf('<p>'+page2ContentCmp.json.content) > -1,
            'should write the contents of \'/page2\'');
        assert.ok(writeLog[2].contents.indexOf('<p>'+page3ContentCmp.json.content) > -1,
            'should write the contents of \'/page3\'');
    });
    testLib.test('POST \'/api/website/upload\' generates and uploads the site', function(assert) {
        assert.expect(17);
        var uploaderCredentials = {};
        var uploadLog = [];
        website.website.Uploader = function(a,b) {
            uploaderCredentials = {username: a, password: b};
            this.upload = function(a,b) { uploadLog.push({path:a,contents:b});return 0; };
        };
        //
        var req = new http.Request('/api/website/upload', 'POST');
        req.data = {remoteUrl: 'ftp://ftp.site.net', username: 'ftp@mysite.net',
                    password: 'bar'};
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
        assert.equal(chunk1, generatedPages[0].url + '|0');
        assert.equal(uploadLog.length, 1, 'should upload page #1');
        assert.equal(uploadLog[0].path, req.data.remoteUrl+'/index.html');
        assert.equal(uploadLog[0].contents, generatedPages[0].html);
        var chunk2 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk2, generatedPages[1].url + '|0');
        assert.equal(uploadLog.length, 2, 'should upload page #2');
        assert.equal(uploadLog[1].path, req.data.remoteUrl+generatedPages[1].url+'.html');
        assert.equal(uploadLog[1].contents, generatedPages[1].html);
        var chunk3 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk3, generatedPages[2].url + '|0');
        assert.equal(uploadLog.length, 3, 'should upload page #3');
        assert.equal(uploadLog[2].path, req.data.remoteUrl+generatedPages[2].url+'.html');
        assert.equal(uploadLog[2].contents, generatedPages[2].html);
        var chunk4 = response.getNextChunk(response.chunkFnState);
        assert.equal(chunk4, '');
        //
        website.website.Uploader = commons.Uploader;
    });
});