require('file-watchers.js').init();
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;

testLib.module('file-watchers.js', function(hooks) {
    var mockTemplate = {fname:'a-template.jsx.htm', contents:null};
    var websiteData = {id: 2, graph: ''};
    var writeLog;
    hooks.before(function() {
        website.website.fs = {
            write:function(a,b) {
                writeLog.push({path:a,contents:b}); return true;
            },
            read: function(a) {
                if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
            }
        };
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
                stmt.bindInt(0, websiteData.id);
                stmt.bindString(1, websiteData.graph);
            }) < 1
        ) throw new Error('Failed to insert test data.');
    });
    hooks.after(function() {
        website.website.fs = commons.fs;
        if (commons.db.delete('delete from websites where id = ?',
            function(stmt) { stmt.bindInt(0, websiteData.id); }) < 1
        ) throw new Error('Failed to clean test data.');
    });
    hooks.afterEach(function() {
        writeLog = [];
        siteGraph.pages = {};
        siteGraph.pageCount = 0;
        siteGraph.templates = [];
        siteGraph.templateCount = 0;
        commons.templateCache._fns = {};
    });
    testLib.test('re-caches a modified template', function(assert) {
        assert.expect(2);
        var samplePage = siteGraph.addPage('/foo', 0, 0);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        var t = siteGraph.addTemplate(mockTemplate.fname, samplePage);
        var cachedTemplateFnBefore = commons.templateCache.get(t.idx); // undefined
        // Trigger the listener function
        assert.ok(typeof fileWatcher._watchFn, 'should set _watchFn');
        fileWatcher._watchFn(fileWatcher.EVENT_MODIFIED, mockTemplate.fname);
        // Assert that called templateCache.put(transpileToFn(newContents))
        assert.ok(commons.templateCache.get(t.idx) != cachedTemplateFnBefore,
            'Should cache the modified template');
    });
    testLib.test('scans new links from a modified template', function(assert) {
        assert.expect(5);
        var samplePage = siteGraph.addPage('/foo', 0, 0);
        var newLink = {href: '/bar', layoutFileName: 'foo.jsx.htm'};
        mockTemplate.contents = '<html><body><a href="' + newLink.href +
            '" layoutFileName="' + newLink.layoutFileName + '"></a></body></html>';
        siteGraph.addTemplate(mockTemplate.fname, samplePage);
        // Trigger the listener function
        fileWatcher._watchFn(fileWatcher.EVENT_MODIFIED, mockTemplate.fname);
        // Assert that updated the website.siteGraph
        var addedPage = siteGraph.getPage(newLink.href);
        assert.ok(addedPage !== undefined, 'should add page to the site-graph');
        assert.equal(addedPage.url, '/bar');
        var addedLayout = siteGraph.findTemplate(newLink.layoutFileName);
        assert.ok(addedLayout !== undefined, 'should add template to the site-graph');
        assert.equal(addedLayout.fileName, newLink.layoutFileName);
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({pages:[[samplePage.url,
                samplePage.parentId,samplePage.layoutIdx],[newLink.href,0,addedLayout.idx]],
                templates:[mockTemplate.fname,newLink.layoutFileName]}),
                'should store updated sitegraph to the database');
        });
    });
});