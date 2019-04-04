require('website-handlers.js').init();
var app = require('app.js').app;
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var http = require('http.js');
var UPLOAD_OK = commons.UploaderStatus.UPLOAD_OK;
var q = '(?,?,?,?)';

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
    function findPage(serPages, url) {
        for (var i = 0; i < serPages.length; ++i) {
            if (serPages[i][0] == url) return serPages[i];
        }
        return null;
    }
});