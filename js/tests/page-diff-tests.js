require('file-watchers.js').init();
var commons = require('common-services.js');
var website = require('website.js');
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;

testLib.module('page-diff', function(hooks) {
    var mockTemplate = {fname:'test.jsx.htm', contents: '<html><body></body></html>'};
    var existingPage;
    hooks.before(function() {
        existingPage = website.siteGraph.addPage('/home', '', mockTemplate.fname, {}, 1);
        website.siteGraph.addTemplate(mockTemplate.fname, true, true);
        website.siteConfig.defaultLayout = mockTemplate.fname;
        website.website.fs = {
            write: function() {},
            read: function(a) {
                if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
            }
        };
        website.website.crypto = {
            sha1: function(str) { return str; }
        };
    });
    hooks.after(function() {
        website.website.fs = commons.fs;
        website.website.crypto = commons.crypto;
        website.siteGraph.clear();
    });
    hooks.afterEach(function() {
        commons.templateCache._fns = {};
    });
    testLib.test('saves the checksums of new pages', function(assert) {
        assert.expect(3);
        var newPage = {url: '/bar'};
        var expectedNewPageChkSum = website.website.crypto.sha1(
            '<html><body>Hello</body></html>');
        var existingPageChkSum = website.website.crypto.sha1(
            '<html><body><a href="' + newPage.url + '"></a></body></html>');
        mockTemplate.contents = '<html><body>{'+
            'url[0] == "home" ? <directives.Link to="' + newPage.url + '"/> : "Hello"' +
        '}</body></html>';
        if (commons.db.insert('insert into uploadStatuses values (?,?,?,?)', function(stmt) {
            stmt.bindString(0, existingPage.url);
            stmt.bindString(1, existingPageChkSum);
            stmt.bindInt(2, website.NOT_UPLOADED);
            stmt.bindInt(3, 0); // isFile
        }) < 1) throw new Error('Failed to setup test data');
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        //
        var uploadStatuses = [];
        commons.db.select('select * from uploadStatuses where `isFile` = 0', function(row) {
            uploadStatuses.push(makeUploadStatus(row));
        });
        assert.equal(uploadStatuses.length, 2);
        var existing = uploadStatuses[0];
        assert.deepEqual(existing, {url: existingPage.url, hash: existingPageChkSum,
            status: website.NOT_UPLOADED, isFile: 0}, 'Shouldn\'t modify old statuses');
        var inserted = uploadStatuses[1];
        assert.deepEqual(inserted, {url: newPage.url, hash: expectedNewPageChkSum,
            status: website.NOT_UPLOADED, isFile: 0});
        //
        if (commons.db.delete('delete from uploadStatuses where `url` in (?,?)',
            function(stmt) {
                stmt.bindString(0, existingPage.url);
                stmt.bindString(1, newPage.url);
            }) < 2
        ) throw new Error('Failed to clean test data.');
    });
    testLib.test('updates the checksums of modified pages', function(assert) {
        assert.expect(2);
        var oldChkSum = website.website.crypto.sha1(
            '<html><body>Fus</body></html>');
        var newChkSum = website.website.crypto.sha1(
            '<html><body>sss</body></html>');
        mockTemplate.contents = '<html><body>{"s"}ss</body></html>';
        if (commons.db.insert('insert into uploadStatuses values (?,?,?,?)', function(stmt) {
            stmt.bindString(0, existingPage.url);
            stmt.bindString(1, oldChkSum);
            stmt.bindInt(2, website.NOT_UPLOADED);
            stmt.bindInt(3, 0); // isFile
        }) < 1) throw new Error('Failed to setup test data');
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        //
        var uploadStatuses = [];
        commons.db.select('select * from uploadStatuses where `isFile` = 0', function(row) {
            uploadStatuses.push(makeUploadStatus(row));
        });
        assert.equal(uploadStatuses.length, 1);
        var newStatus = uploadStatuses[0];
        assert.deepEqual(newStatus, {url: existingPage.url, hash: newChkSum,
            status: website.NOT_UPLOADED, isFile: 0}, 'Should update the checksum');
        //
        if (commons.db.delete('delete from uploadStatuses where `url` = ?',
            function(stmt) {
                stmt.bindString(0, existingPage.url);
            }) < 1
        ) throw new Error('Failed to clean test data.');
    });
    function makeUploadStatus(row) {
        return {url: row.getString(0), hash: row.getString(1),
                status: row.getInt(2), isFile: row.getInt(3)};
    }
});