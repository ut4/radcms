require('file-watchers.js').init();
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var NO_PARENT = '';

testLib.module('resource-diff', function(hooks) {
    var mockCssFile = {url:'/styles/main.css', contents: 'p {}'};
    var mockJsFile = {url:'/foo.js', contents: 'var a;'};
    var mockTemplate = {fname:'test.jsx.htm', contents: ''};
    hooks.before(function() {
        website.website.fs = {
            write:function() {},
            read: function(a) {
                if(a==insnEnv.sitePath + mockCssFile.url.substr(1)) return mockCssFile.contents;
                if(a==insnEnv.sitePath + mockJsFile.url.substr(1)) return mockJsFile.contents;
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
    });
    hooks.afterEach(function() {
        siteGraph.clear();
        commons.templateCache._fns = {};
    });
    testLib.test('spots new css/js from a modified template', function(assert) {
        assert.expect(12);
        siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {}, 1);
        siteGraph.addTemplate(mockTemplate.fname, true, true);
        mockTemplate.contents = '<html><body>'+
            '<link href="' + mockCssFile.url + '" rel="stylesheet">' +
            '<script src="' + mockJsFile.url + '"></script>' +
        '</body></html>';
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        //
        var actuallyInsertedStatuses = [];
        var actuallyInsertedFiles = [];
        commons.db.select('select * from uploadStatuses', function(row) {
            actuallyInsertedStatuses.push({url: row.getString(0),
                hash: row.getString(1), status: row.getInt(2),
                isFile: row.getInt(3)});
        });
        commons.db.select('select * from staticFileResources', function(row) {
            actuallyInsertedFiles.push({url: row.getString(0)});
        });
        assert.equal(actuallyInsertedStatuses.length, 2);
        assert.equal(actuallyInsertedFiles.length, 2);
        assert.equal(actuallyInsertedFiles[0].url, mockCssFile.url);
        assert.equal(actuallyInsertedFiles[1].url, mockJsFile.url);
        assert.equal(actuallyInsertedStatuses[0].url, mockCssFile.url);
        assert.equal(actuallyInsertedStatuses[0].hash, mockCssFile.contents);
        assert.equal(actuallyInsertedStatuses[0].status, website.NOT_UPLOADED);
        assert.equal(actuallyInsertedStatuses[0].isFile, 1);
        assert.equal(actuallyInsertedStatuses[1].url, mockJsFile.url);
        assert.equal(actuallyInsertedStatuses[1].hash, mockJsFile.contents);
        assert.equal(actuallyInsertedStatuses[1].status, website.NOT_UPLOADED);
        assert.equal(actuallyInsertedStatuses[1].isFile, 1);
        //
        if (
            commons.db.delete('delete from uploadStatuses', function() {
                //
            }) < actuallyInsertedStatuses.length ||
            commons.db.delete('delete from staticFileResources', function() {
                //
            }) < actuallyInsertedFiles.length
        ) throw new Error('Failed to clean test data.');
    });
});