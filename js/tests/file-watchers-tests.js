require('file-watchers.js').init();
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var NO_PARENT = 0;

testLib.module('file-watchers.js', function(hooks) {
    var mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    var mockTemplate2 = {fname:'template-b.jsx.htm', contents:null};
    var websiteData = {id: 2, graph: ''};
    var writeLog;
    hooks.before(function() {
        website.website.fs = {
            write:function(a,b) {
                writeLog.push({path:a,contents:b}); return true;
            },
            read: function(a) {
                if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
                if(a==insnEnv.sitePath + mockTemplate2.fname) return mockTemplate2.contents;
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
    testLib.test('adds a new template', function(assert) {
        assert.expect(2);
        // Trigger handleFWEvent()
        var templateBefore = siteGraph.findTemplate(mockTemplate.fname); // undefined
        fileWatcher._watchFn(fileWatcher.EVENT_CREATE, mockTemplate.fname);
        // Assert that added the template to website.siteGraph
        var templateAfter = siteGraph.findTemplate(mockTemplate.fname);
        assert.ok(templateAfter !== templateBefore, 'should add a template to siteGraph');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({pages:[],
                templates:[mockTemplate.fname]}),
                'should store the updated sitegraph to the database');
        });
    });
    testLib.test('re-caches a modified template', function(assert) {
        assert.expect(1);
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, 0);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        var t = siteGraph.addTemplate(mockTemplate.fname, existingPage);
        var cachedTemplateFnBefore = commons.templateCache.get(t.idx); // undefined
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that called templateCache.put(transpileToFn(newContents))
        assert.ok(commons.templateCache.get(t.idx) !== cachedTemplateFnBefore,
            'Should cache the modified template');
    });
    testLib.test('scans new links from a modified template', function(assert) {
        assert.expect(3);
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, 0);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, existingPage);
        var newLink = {href: '/bar', layoutFileName: mockTemplate.fname};
        mockTemplate.contents = '<html><body><a href="' + newLink.href +
            '" layoutFileName="' + newLink.layoutFileName + '"></a></body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that updated website.siteGraph
        var addedPage = siteGraph.getPage(newLink.href);
        assert.ok(addedPage !== undefined, 'should add a page to website.siteGraph');
        assert.equal(addedPage.url, '/bar');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage.url,NO_PARENT,existingLayout.idx],
                    [newLink.href,NO_PARENT,existingLayout.idx]
                ],
                templates:[existingLayout.fileName]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('scans new links recursively', function(assert) {
        assert.expect(5);
        var templateALink = {href: '/bar', layoutFileName: mockTemplate2.fname};
        var templateBLink = {href: '/nar', layoutFileName: mockTemplate.fname};
        // Existing /foo contains a link to /bar
        mockTemplate.contents = '<html><body><a href="' + templateALink.href +
            '" layoutFileName="' + templateALink.layoutFileName + '"></a></body></html>';
        // New link /bar contains a link to /nar
        mockTemplate2.contents = '<html><body><a href="' + templateBLink.href +
            '" layoutFileName="' + templateBLink.layoutFileName + '"></a></body></html>';
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, 0);
        var t1 = siteGraph.addTemplate(mockTemplate.fname, existingPage); t1.exists = true;
        var t2 = siteGraph.addTemplate(mockTemplate2.fname, null); t2.exists = true;
        website.website.compileAndCacheTemplate(t1);
        website.website.compileAndCacheTemplate(t2);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that added both pages to website.siteGraph
        var added1 = siteGraph.getPage(templateALink.href);
        assert.ok(added1 !== undefined, 'should add page #1 to website.siteGraph');
        assert.equal(added1.url, '/bar');
        var added2 = siteGraph.getPage(templateBLink.href);
        assert.ok(added2 !== undefined, 'should add page #2 to website.siteGraph');
        assert.equal(added2.url, '/nar');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages: [
                    [existingPage.url,NO_PARENT,existingPage.layoutIdx],
                    [templateALink.href,NO_PARENT,existingPage.layoutIdx+1],
                    [templateBLink.href,NO_PARENT,existingPage.layoutIdx]
                ],
                templates:[mockTemplate.fname,mockTemplate2.fname]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('doesn\'t add aliases (<a href=\'/\'>)', function(assert) {
        assert.expect(1);
        mockTemplate.contents = '<html><body><a href="/" layoutFileName="' +
            mockTemplate.fname + '"></a><a href="" layoutFileName="' +
            mockTemplate.fname + '"></a></body></html>';
        var existingPage = siteGraph.addPage('/home', NO_PARENT, 0);
        website.siteConfig.homeUrl = '/home';
        siteGraph.addTemplate(mockTemplate.fname, existingPage);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that didn't add '/'
        assert.ok(!siteGraph.getPage('/'), 'shouldn\'t add \'/\'');
    });
});