require('file-watchers.js').init();
var commons = require('common-services.js');
var siteGraph = require('website.js').siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;

testLib.module('file-watchers.js', function(hooks) {
    var mockTemplate = {fname:'a-template.jsx.htm', contents:null};
    var originalFsWrite = commons.fs.write;
    var originalFsRead = commons.fs.read;
    var writeLog;
    hooks.beforeEach(function() {
        writeLog = [];
        commons.fs.write = function(a,b) {
            writeLog.push({path:a,contents:b}); return true;
        };
        commons.fs.read = function(a) {
            if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
        };
    });
    hooks.afterEach(function() {
        commons.fs.write = originalFsWrite;
        commons.fs.read = originalFsRead;
        siteGraph.pages = {};
        siteGraph.pageCount = 0;
        siteGraph.templates = [];
        siteGraph.templateCount = 0;
    });
    testLib.test('re-caches a modified template', function(assert) {
        assert.expect(2);
        var samplePage = siteGraph.addPage('/foo', 0, 0);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        siteGraph.addTemplate(mockTemplate.fname, samplePage);
        //
        assert.ok(typeof fileWatcher._watchFn, 'should set _watchFn');
        fileWatcher._watchFn(fileWatcher.EventModified, mockTemplate.fname);
        assert.equal(writeLog[0], mockTemplate.contents, 'should fs.write(newContent)');
    });
    testLib.test('scans new links from a modified template', function(assert) {
        assert.expect(4);
        var samplePage = siteGraph.addPage('/foo', 0, 0);
        var newLink = {href: '/bar', layoutFileName: 'foo.jsx.htm'};
        mockTemplate.contents = '<html><body><a href="' + newLink.href +
            '" layoutFileName="' + newLink.layoutFileName + '"></a></body></html>';
        siteGraph.addTemplate(mockTemplate.fname, samplePage);
        //
        fileWatcher._watchFn(fileWatcher.EventModified, mockTemplate.fname);
        var page = siteGraph.getPage(newLink.href);
        assert.ok(page !== undefined, 'should add page to the site-graph');
        assert.equal(page.url, '/bar');
        var layout = siteGraph.findTemplate(newLink.layoutFileName);
        assert.ok(layout !== undefined, 'should add template to the site-graph');
        assert.equal(layout.fileName, newLink.layoutFileName);
    });
});