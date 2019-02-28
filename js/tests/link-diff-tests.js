var fileWatchers = require('file-watchers.js');
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var diff = require('website-diff.js');
var NO_PARENT = '';

var makeLinks = function() {
    return '[' + [].slice.call(arguments).map(function(url) {
        return '<RadLink to="' + url + '"/>';
    }) + ']';
};

testLib.module('link-diff', function(hooks) {
    var mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    var mockTemplate2 = {fname:'template-b.jsx.htm', contents:null};
    var websiteData = {id: 3, graph: ''};
    var originalRemoteDiff = diff.RemoteDiff;
    hooks.before(function() {
        diff.RemoteDiff = function(){};
        diff.RemoteDiff.prototype.addPageToCheck = function(){};
        diff.RemoteDiff.prototype.addFileToCheck = function(){};
        diff.RemoteDiff.prototype.addPageToDelete = function(){};
        diff.RemoteDiff.prototype.saveStatusesToDb = function(){};
        website.siteConfig.homeUrl = '/home';
        website.siteConfig.defaultLayout = mockTemplate.fname;
        website.website.fs = {
            write:function() {},
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
        fileWatchers.init();
    });
    hooks.after(function() {
        diff.RemoteDiff = originalRemoteDiff;
        website.website.fs = commons.fs;
        if (commons.db.delete('delete from websites where id = ?',
            function(stmt) { stmt.bindInt(0, websiteData.id); }) < 1
        ) throw new Error('Failed to clean test data.');
        fileWatchers.clear();
    });
    hooks.afterEach(function() {
        siteGraph.clear();
        commons.templateCache.clear();
    });
    testLib.test('spots a new link from a modified template', function(assert) {
        assert.expect(2);
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {}, 1);
        commons.templateCache.put(mockTemplate.fname, function() {});
        var newLinkUrl = '/bar';
        mockTemplate.contents = '<html><body>'+
            '<RadLink to="' + newLinkUrl + '"/>' +
            '<RadLink to="' + newLinkUrl + '"/>'+ // dupes shouldn't matter
        '</body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that added the page to website.siteGraph
        var addedPage = siteGraph.getPage(newLinkUrl);
        assert.ok(addedPage !== undefined, 'should add a page to website.siteGraph');
        // Assert that saved the updated site graph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage.url,NO_PARENT,mockTemplate.fname,[newLinkUrl]],
                    [newLinkUrl,NO_PARENT,mockTemplate.fname,[newLinkUrl]]
                ]
            }), 'should store the updated site graph to the database');
        });
    });
    testLib.test('spots a removed link from a modified template', function(assert) {
        assert.expect(2);
        var refCount = 1;
        var existingPage1 = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {'/bar': 1}, 1);
        var existingPage2 = siteGraph.addPage('/bar', NO_PARENT, mockTemplate.fname, {}, refCount);
        commons.templateCache.put(mockTemplate.fname, function() {});
        mockTemplate.contents = '<html><body>' +
            // a link has disappeared
        '</body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that removed the page to website.siteGraph
        assert.ok(!siteGraph.getPage(existingPage2), 'Should remove a page from website.siteGraph');
        // Assert that saved the updated site graph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage1.url,NO_PARENT,mockTemplate.fname,[]]
                ]
            }), 'should store the updated site graph to the database');
        });
    });
    testLib.test('doesn\'t remove pages that still have references somewhere', function(assert) {
        assert.expect(2);
        var refCount = 2;
        var existingPage1 = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {'/bar': 1}, 1);
        var existingPage2 = siteGraph.addPage('/bar', NO_PARENT, mockTemplate.fname, {}, refCount);
        commons.templateCache.put(mockTemplate.fname, function() {});
        mockTemplate.contents = '<html><body></body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that didn't remove the page
        assert.equal(siteGraph.getPage(existingPage2.url), existingPage2,
            'Should not remove the page');
        // Assert that saved the updated site graph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage1.url,NO_PARENT,mockTemplate.fname,[]],
                    [existingPage2.url,NO_PARENT,mockTemplate.fname,[]]
                ]
            }), 'should store the updated site graph to the database');
        });
    });
    testLib.test('swaps a parent page', function(assert) {
        assert.expect(4);
        siteGraph.parseAndLoadFrom(JSON.stringify({
            pages: [
                ['/home','',mockTemplate.fname,['/starters','/desserts']],
                ['/starters','',mockTemplate.fname,['/starters/dish1']],
                ['/starters/dish1','/starters',mockTemplate.fname,['/starters']],
                ['/desserts','',mockTemplate.fname,['/desserts/dish2']],
                ['/desserts/dish2','/desserts',mockTemplate.fname,['/desserts']],
            ]
        }));
        mockTemplate.contents = '<html><body>{'+
            '({'+
                '"home":' + makeLinks('/starters','/desserts') +
                ',"starters":""' + // /starters/dish1 has disappeared
                ',"starters/dish1":' + makeLinks('/starters') +
                ',"desserts":' + makeLinks('/desserts/dish2','/desserts/dish1') + // desserts/dish1 has appeared
                ',"desserts/dish2":' + makeLinks('/desserts') +
                ',"desserts/dish1":' + makeLinks('/desserts') +
            '})[url.join("/")]'+
        '}</body></html>';
        website.website.compileAndCacheTemplate(mockTemplate.fname);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that removed /starters/dish1 and added /desserts/dish1
        assert.ok(!siteGraph.getPage('/starters/dish1'), 'Should remove /starters/dish1');
        var newDish1 = siteGraph.getPage('/desserts/dish1');
        assert.ok(newDish1 !== undefined, 'Should add /desserts/dish1');
        assert.equal(newDish1.parentUrl, '/desserts', 'Should update .parentUrl /starters -> /desserts');
        //
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[['/home','',mockTemplate.fname,['/starters','/desserts']],
                       ['/starters','',mockTemplate.fname,[]],
                       ['/desserts','',mockTemplate.fname,['/desserts/dish2','/desserts/dish1']],
                       ['/desserts/dish2','/desserts',mockTemplate.fname,['/desserts']],
                       ['/desserts/dish1','/desserts',mockTemplate.fname,['/desserts']]]
            }), 'should store the updated site graph to the database');
        });
    });
    testLib.test('follows new pages recursively', function(assert) {
        assert.expect(5);
        var linkAHref = '/bar';
        var linkBHref = '/nar';
        var commonAttrs = '" layoutOverride="'+mockTemplate.fname+'"';
        // Existing /foo contains a link to a new page /bar
        // New page /bar contains a link to another new page /nar
        mockTemplate.contents = '<html><body>{ url[0] == "foo" ? '+
            '<RadLink to="' + linkAHref + commonAttrs + '/> : '+
            '<RadLink to="' + linkBHref + commonAttrs + '/> }'+
        '</body></html>';
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname,
            {}, // Doesn't initially link anywhere
            1);
        website.website.compileAndCacheTemplate(mockTemplate.fname);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that added two new pages to website.siteGraph
        var added1 = siteGraph.getPage(linkAHref);
        assert.ok(added1 !== undefined, 'should add page #1 to website.siteGraph');
        assert.equal(added1.url, '/bar');
        var added2 = siteGraph.getPage(linkBHref);
        assert.ok(added2 !== undefined, 'should add page #2 to website.siteGraph');
        assert.equal(added2.url, '/nar');
        // Assert that saved the updated site graph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages: [
                    [existingPage.url,NO_PARENT,mockTemplate.fname,[linkAHref]],
                    [linkAHref,NO_PARENT,mockTemplate.fname,[linkBHref]],
                    [linkBHref,NO_PARENT,mockTemplate.fname,[linkBHref]]
                ]
            }), 'should store the updated site graph to the database');
        });
    });
    testLib.test('doesn\'t add aliases (<Link to="/"/>)', function(assert) {
        assert.expect(2);
        mockTemplate.contents = '<html><body>'+
            '<RadLink to="/"/>'+
        '</body></html>';
        var existingPage = siteGraph.addPage('/home', NO_PARENT, mockTemplate.fname);
        var refCountBefore = existingPage.refCount;
        website.siteConfig.homeUrl = '/home';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that didn't add '/'
        assert.ok(!siteGraph.getPage('/'), 'shouldn\'t add \'/\'');
        assert.equal(siteGraph.getPage('/home').refCount, refCountBefore,
            'Shouldn\'t increase refCount');
    });
});