require('file-watchers.js').init();
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var NO_PARENT = 0;

testLib.module('file-watchers.js', function(hooks) {
    var mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    var websiteData = {id: 2, graph: ''};
    var writeLog;
    hooks.before(function() {
        website.siteConfig.defaultLayout = mockTemplate.fname;
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
        siteGraph.templates = {};
        siteGraph.templateCount = 0;
        siteGraph.linkSpawners = {};
        commons.templateCache._fns = {};
    });
    testLib.test('adds a template', function(assert) {
        assert.expect(2);
        // Trigger handleFWEvent()
        var templateBefore = siteGraph.getTemplate(mockTemplate.fname); // undefined
        fileWatcher._watchFn(fileWatcher.EVENT_CREATE, mockTemplate.fname);
        // Assert that added the template to website.siteGraph
        var templateAfter = siteGraph.getTemplate(mockTemplate.fname);
        assert.ok(templateAfter !== templateBefore, 'should add a template to siteGraph');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({pages:[],
                templates:[mockTemplate.fname],linkSpawners:[]}),
                'should store the updated sitegraph to the database');
        });
    });
    testLib.test('re-caches a modified template', function(assert) {
        assert.expect(1);
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        var t = siteGraph.addTemplate(mockTemplate.fname, existingPage, true);
        var cachedTemplateFnBefore = commons.templateCache.get(t.fileName); // undefined
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that called templateCache.put(transpileToFn(newContents))
        assert.ok(commons.templateCache.get(t.fileName) !== cachedTemplateFnBefore,
            'Should cache the modified template');
    });
    testLib.test('spots new links from a modified template', function(assert) {
        assert.expect(2);
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, existingPage, true);
        var newLinkUrl = '/bar';
        mockTemplate.contents = '<html><body>'+
            '<directives.Link to="' + newLinkUrl + '"/>' +
            '<directives.Link to="' + newLinkUrl + '"/>'+ // dupes shouldn't matter
        '</body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that added the page to website.siteGraph
        var addedPage = siteGraph.getPage(newLinkUrl);
        assert.ok(addedPage !== undefined, 'should add a page to website.siteGraph');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage.url,NO_PARENT,existingLayout.fileName,[newLinkUrl]],
                    [newLinkUrl,NO_PARENT,existingLayout.fileName,[]]
                ],
                templates:[existingLayout.fileName],
                linkSpawners:[]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('spots removed links from a modified template', function(assert) {
        assert.expect(2);
        var refCount = 1;
        var existingPage1 = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {'/bar': 1});
        var existingPage2 = siteGraph.addPage('/bar', NO_PARENT, mockTemplate.fname, {}, refCount);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, existingPage1, true);
        mockTemplate.contents = '<html><body>'/*a link has disappeared*/+'</body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that removed the page to website.siteGraph
        assert.ok(!siteGraph.getPage(existingPage2), 'Should remove a page from website.siteGraph');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage1.url,NO_PARENT,existingLayout.fileName,
                     [/*doesn't link to anywhere anymore*/]]
                ],
                templates:[existingLayout.fileName],
                linkSpawners:[]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('doesn\'t remove pages that still have references somewhere', function(assert) {
        assert.expect(2);
        var refCount = 2;
        var existingPage1 = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {'/bar': 1});
        var existingPage2 = siteGraph.addPage('/bar', NO_PARENT, mockTemplate.fname, {}, refCount);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, existingPage1, true);
        mockTemplate.contents = '<html><body>'/*a link has disappeared*/+'</body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that didn't remove the page
        assert.equal(siteGraph.getPage(existingPage2.url), existingPage2,
            'Should not remove the page');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage1.url,NO_PARENT,existingLayout.fileName,
                     [/*doesn't link to anywhere anymore*/]],
                    [existingPage2.url,NO_PARENT,existingLayout.fileName,[]]
                ],
                templates:[existingLayout.fileName],
                linkSpawners:[]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('follows links', function(assert) {
        assert.expect(5);
        var linkAHref = '/bar';
        var linkBHref = '/nar';
        var commonAttrs = '" layoutOverride="'+mockTemplate.fname+'" follow="true"';
        // Existing /foo has a link to a new page /bar
        // New page /bar has a link to another new page /nar
        mockTemplate.contents = '<html><body>{ url[0] == "foo" ? '+
            '<directives.Link to="' + linkAHref + commonAttrs + '/> : '+
            '<directives.Link to="' + linkBHref + commonAttrs + '/> }'+
        '</body></html>';
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname);
        var t1 = siteGraph.addTemplate(mockTemplate.fname, existingPage, true);
        website.website.compileAndCacheTemplate(t1.fileName);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that added both pages to website.siteGraph
        var added1 = siteGraph.getPage(linkAHref);
        assert.ok(added1 !== undefined, 'should add page #1 to website.siteGraph');
        assert.equal(added1.url, '/bar');
        var added2 = siteGraph.getPage(linkBHref);
        assert.ok(added2 !== undefined, 'should add page #2 to website.siteGraph');
        assert.equal(added2.url, '/nar');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages: [
                    [existingPage.url,NO_PARENT,mockTemplate.fname,[linkAHref]],
                    [linkAHref,NO_PARENT,mockTemplate.fname,[linkBHref]],
                    [linkBHref,NO_PARENT,mockTemplate.fname,[linkBHref]]
                ],
                templates:[mockTemplate.fname],
                linkSpawners:[]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('doesn\'t add aliases (<Link to="/"/>)', function(assert) {
        assert.expect(2);
        mockTemplate.contents = '<html><body>'+
            '<directives.Link to="/"/>'+
        '</body></html>';
        var existingPage = siteGraph.addPage('/home', NO_PARENT, mockTemplate.fname);
        var refCountBefore = existingPage.refCount;
        website.siteConfig.homeUrl = '/home';
        siteGraph.addTemplate(mockTemplate.fname, existingPage, true);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that didn't add '/'
        assert.ok(!siteGraph.getPage('/'), 'shouldn\'t add \'/\'');
        assert.equal(siteGraph.getPage('/home').refCount, refCountBefore,
            'Shouldn\'t increase refCount');
    });
    testLib.test('removes a template', function(assert) {
        assert.expect(2);
        siteGraph.addTemplate(mockTemplate.fname, null, true);
        var siteGraphBefore = siteGraph.serialize();
        //
        fileWatcher._watchFn(fileWatcher.EVENT_REMOVE, mockTemplate.fname);
        //
        assert.ok(siteGraph.serialize().length < siteGraphBefore.length,
            'Should remove the template from website.siteGraph');
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages: [],
                templates:[],
                linkSpawners:[]
            }), 'should store the updated sitegraph to the database');
        });
    });
});