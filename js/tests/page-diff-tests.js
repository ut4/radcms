var app = require('app.js').app;
var fileWatchers = require('file-watchers.js');
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;

testLib.module('page-diff', function(hooks) {
    var mockTemplate = {fname:'test.jsx.htm', contents: '<html><body></body></html>'};
    var homePage;
    var db;
    hooks.before(function() {
        db = app.currentWebsite.db;
        homePage = siteGraph.addPage('/home', '', mockTemplate.fname, {}, 1);
        commons.templateCache.put(mockTemplate.fname, function() {});
        website.siteConfig.defaultLayout = mockTemplate.fname;
        app.currentWebsite.fs = {
            write: function() {},
            read: function(a) {
                if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
            }
        };
        app.currentWebsite.crypto = {sha1: function(str) { return str; }};
        fileWatchers.init();
    });
    hooks.after(function() {
        app.currentWebsite.fs = commons.fs;
        app.currentWebsite.crypto = require('crypto.js');
        siteGraph.clear();
        fileWatchers.clear();
    });
    hooks.afterEach(function() {
        commons.templateCache.clear();
    });
    testLib.test('saves the checksums of new pages', function(assert) {
        assert.expect(3);
        var newPage = {url: '/bar'};
        var expectedNewPageChkSum = app.currentWebsite.crypto.sha1(
            '<html><body>Hello</body></html>');
        var homePageChkSum = app.currentWebsite.crypto.sha1(
            '<html><body><a href="' + newPage.url + '"></a></body></html>');
        mockTemplate.contents = '<html><body>{'+
            'url[0] == "home" ? <RadLink to="' + newPage.url + '"/> : "Hello"' +
        '}</body></html>';
        if (db.insert('insert into uploadStatuses values (?,?,null,0)', function(stmt) {
            stmt.bindString(0, homePage.url);
            stmt.bindString(1, homePageChkSum);
        }) < 1) throw new Error('Failed to setup test data');
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        //
        var uploadStatuses = [];
        db.select('select * from uploadStatuses where `isFile` = 0', function(row) {
            uploadStatuses.push(makeUploadStatus(row));
        });
        assert.equal(uploadStatuses.length, 2);
        var existing = uploadStatuses[0];
        assert.deepEqual(existing, {url: homePage.url, curhash: homePageChkSum,
            uphash: null, isFile: 0}, 'Shouldn\'t modify old statuses');
        var inserted = uploadStatuses[1];
        assert.deepEqual(inserted, {url: newPage.url, curhash: expectedNewPageChkSum,
            uphash: null, isFile: 0});
        //
        homePage.linksTo = {};
        delete siteGraph.pages[newPage.url];
        if (db.delete('delete from uploadStatuses where `url` in (?,?)',
            function(stmt) {
                stmt.bindString(0, homePage.url);
                stmt.bindString(1, newPage.url);
            }) < 2
        ) throw new Error('Failed to clean test data.');
    });
    testLib.test('updates the checksums of modified pages', function(assert) {
        assert.expect(2);
        var oldChkSum = app.currentWebsite.crypto.sha1(
            '<html><body>Fus</body></html>');
        var newChkSum = app.currentWebsite.crypto.sha1(
            '<html><body>sss</body></html>');
        mockTemplate.contents = '<html><body>{"s"}ss</body></html>';
        if (db.insert('insert into uploadStatuses values (?,?,null,0)', function(stmt) {
            stmt.bindString(0, homePage.url);
            stmt.bindString(1, oldChkSum);
        }) < 1) throw new Error('Failed to setup test data');
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        //
        var uploadStatuses = [];
        db.select('select * from uploadStatuses where `isFile` = 0', function(row) {
            uploadStatuses.push(makeUploadStatus(row));
        });
        assert.equal(uploadStatuses.length, 1);
        var newStatus = uploadStatuses[0];
        assert.deepEqual(newStatus, {url: homePage.url, curhash: newChkSum,
            uphash: null, isFile: 0}, 'Should update the checksum');
        //
        if (db.delete('delete from uploadStatuses where `url` = ?',
            function(stmt) {
                stmt.bindString(0, homePage.url);
            }) < 1
        ) throw new Error('Failed to reset test data.');
    });
    testLib.test('updates or deletes the checksums of removed pages', function(assert) {
        assert.expect(2);
        homePage.linksTo = {'/foo': 1, '/bar': 1};
        var removedPage = siteGraph.addPage('/foo', '', mockTemplate.fname, {}, 1);
        var removedUploadedPage = siteGraph.addPage('/bar', '', mockTemplate.fname, {}, 1);
        mockTemplate.contents = '<html><body>both links gone</body></html>';
        if (db.insert('insert into uploadStatuses values (?,?,?,0),\
            (?,\'foo\',null,0),(?,\'foo\',\'foo\',0)',
            function(stmt) {
                stmt.bindString(0, homePage.url);
                stmt.bindString(1, app.currentWebsite.crypto.sha1(mockTemplate.contents));
                stmt.bindString(2, app.currentWebsite.crypto.sha1(mockTemplate.contents));
                stmt.bindString(3, removedPage.url);
                stmt.bindString(4, removedUploadedPage.url);
            }) < 1) throw new Error('Failed to setup test data');
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        //
        var uploadStatuses = [];
        db.select('select * from uploadStatuses where `isFile` = 0 and\
            `url` != ?', function(row) {
                uploadStatuses.push(makeUploadStatus(row));
            }, function(stmt) {
                stmt.bindString(0, homePage.url);
            });
        var status = uploadStatuses[0];
        assert.deepEqual(status, {url: removedUploadedPage.url, curhash: null,
            uphash: 'foo', isFile: 0},
            'Should clear the checksum of the uploaded removed page');
        assert.ok(uploadStatuses[1] === undefined,
            'Should remove the non-uploaded page completely');
        //
        homePage.linksTo = {};
        if (db.delete('delete from uploadStatuses where `url` in (?,?)',
            function(stmt) {
                stmt.bindString(0, homePage.url);
                stmt.bindString(1, removedUploadedPage.url);
            }) < 2
        ) throw new Error('Failed to reset test data.');
    });
    function makeUploadStatus(row) {
        return {url: row.getString(0), curhash: row.getString(1),
                uphash: row.getString(2), isFile: row.getInt(3)};
    }
});