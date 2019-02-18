var fileWatchers = require('file-watchers.js');
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var NO_PARENT = '';

testLib.module('file-watchers.js', function(hooks) {
    var mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    var websiteData = {id: 2, graph: ''};
    hooks.before(function() {
        website.website.fs = {
            read: function(a) {
                if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
            }
        };
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
                stmt.bindInt(0, websiteData.id);
                stmt.bindString(1, websiteData.graph);
            }) < 1
        ) throw new Error('Failed to insert test data.');
        fileWatchers.init();
    });
    hooks.after(function() {
        website.website.fs = commons.fs;
        if (commons.db.delete('delete from websites where id = ?',
            function(stmt) { stmt.bindInt(0, websiteData.id); }) < 1
        ) throw new Error('Failed to clean test data.');
        fileWatchers.clear();
    });
    hooks.afterEach(function() {
        siteGraph.clear();
        commons.templateCache._fns = {};
    });
    testLib.test('EVENT_CREATE <newLayout>.jsx.htm updates siteGraph.templates', function(assert) {
        assert.expect(2);
        // Trigger handleFWEvent()
        var templateBefore = siteGraph.getTemplate(mockTemplate.fname); // undefined
        fileWatcher._watchFn(fileWatcher.EVENT_CREATE, mockTemplate.fname);
        // Assert that added the template to website.siteGraph
        var templateAfter = siteGraph.getTemplate(mockTemplate.fname);
        assert.ok(templateAfter !== templateBefore, 'should add a template to siteGraph');
        // Assert that saved the updated site graph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({pages:[],
                templates:[[mockTemplate.fname,0,0]]}),
                'should store the updated site graph to the database');
        });
    });
    testLib.test('EVENT_WRITE <existingLayout>.jsx.htm updates siteGraph.templates', function(assert) {
        assert.expect(1);
        siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        var t = siteGraph.addTemplate(mockTemplate.fname, true);
        var cachedTemplateFnBefore = commons.templateCache.get(t.fileName); // undefined
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that called templateCache.put(transpileToFn(newContents))
        assert.ok(commons.templateCache.get(t.fileName) !== cachedTemplateFnBefore,
            'Should cache the modified template');
    });
    testLib.test('EVENT_REMOVE <existingLayout>.jsx.htm updates siteGraph.templates', function(assert) {
        assert.expect(2);
        siteGraph.addTemplate(mockTemplate.fname, true);
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
                templates:[]
            }), 'should store the updated site graph to the database');
        });
    });
});