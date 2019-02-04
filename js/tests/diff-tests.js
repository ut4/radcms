require('file-watchers.js').init();
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var NO_PARENT = '';

var makeLinks = function() {
    return '[' + [].slice.call(arguments).map(function(url) {
        return '<directives.Link to="' + url + '"/>';
    }) + ']';
};

testLib.module('diff', function(hooks) {
    var mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    var mockTemplate2 = {fname:'template-b.jsx.htm', contents:null};
    var websiteData = {id: 3, graph: ''};
    hooks.before(function() {
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
    });
    hooks.after(function() {
        website.website.fs = commons.fs;
        if (commons.db.delete('delete from websites where id = ?',
            function(stmt) { stmt.bindInt(0, websiteData.id); }) < 1
        ) throw new Error('Failed to clean test data.');
    });
    hooks.afterEach(function() {
        siteGraph.pages = {};
        siteGraph.pageCount = 0;
        siteGraph.templates = {};
        siteGraph.templateCount = 0;
        commons.templateCache._fns = {};
    });
    testLib.test('spots a new link from a modified template', function(assert) {
        assert.expect(2);
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {}, 1);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, true);
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
                    [newLinkUrl,NO_PARENT,existingLayout.fileName,[newLinkUrl]]
                ],
                templates:[existingLayout.fileName]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('spots a removed link from a modified template', function(assert) {
        assert.expect(2);
        var refCount = 1;
        var existingPage1 = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {'/bar': 1}, 1);
        var existingPage2 = siteGraph.addPage('/bar', NO_PARENT, mockTemplate.fname, {}, refCount);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, true);
        mockTemplate.contents = '<html><body>' +
            // a link has disappeared
        '</body></html>';
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that removed the page to website.siteGraph
        assert.ok(!siteGraph.getPage(existingPage2), 'Should remove a page from website.siteGraph');
        // Assert that saved the updated sitegraph to the database
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    [existingPage1.url,NO_PARENT,existingLayout.fileName,[]]
                ],
                templates:[existingLayout.fileName]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('doesn\'t remove pages that still have references somewhere', function(assert) {
        assert.expect(2);
        var refCount = 2;
        var existingPage1 = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname, {'/bar': 1}, 1);
        var existingPage2 = siteGraph.addPage('/bar', NO_PARENT, mockTemplate.fname, {}, refCount);
        var existingLayout = siteGraph.addTemplate(mockTemplate.fname, true);
        mockTemplate.contents = '<html><body></body></html>';
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
                    [existingPage1.url,NO_PARENT,existingLayout.fileName,[]],
                    [existingPage2.url,NO_PARENT,existingLayout.fileName,[]]
                ],
                templates:[existingLayout.fileName]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('removes an unreachable page', function(assert) {
        assert.expect(3);
        website.siteConfig.homeUrl = '/news';
        siteGraph.parseAndLoadFrom(JSON.stringify({
            pages: [
                ['/news',NO_PARENT,mockTemplate.fname,['/news','/art1','/art2','/news/2']],
                ['/news/2','/news',mockTemplate.fname,['/news','/art3','/art4','/news/3']],
                ['/news/3','/news/2',mockTemplate.fname,['/news','/news/2']],
                ['/art1',NO_PARENT,mockTemplate2.fname,['/news']],
                ['/art2',NO_PARENT,mockTemplate2.fname,['/news']],
                ['/art3',NO_PARENT,mockTemplate2.fname,['/news']],
                ['/art4',NO_PARENT,mockTemplate2.fname,['/news']],
            ],
            templates: [mockTemplate.fname, mockTemplate2.fname]
        }));
        mockTemplate.contents = '<html><body>{ !url[1] '+
            // /news - news/2 has disappeared, and /art3 and /art4 has appeared
            '? ' + makeLinks('/news','/art1','/art2','/art3','/art4') +
            // / Same as /news (old: ['/news','/art3','/art4','/news/3'] and ['/news','/news/2'])
            ': ' + makeLinks('/news','/art1','/art2','/art3','/art4') +
        '}</body></html>';
        mockTemplate2.contents = '<html><body><h1>Hello from article</h1>' +
            makeLinks('/news') +
        '</body></html>';
        website.website.compileAndCacheTemplate(mockTemplate.fname);
        website.website.compileAndCacheTemplate(mockTemplate2.fname);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that removed /news/2
        assert.ok(!siteGraph.getPage('/news/2'), 'Should remove /news/2');
        assert.ok(!siteGraph.getPage('/news/3'), 'Should remove /news/2');
        //
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[
                    ['/news','',mockTemplate.fname,['/news','/art1','/art2','/art3','/art4']],
                    ['/art1',NO_PARENT,mockTemplate2.fname,['/news']],
                    ['/art2',NO_PARENT,mockTemplate2.fname,['/news']],
                    ['/art3',NO_PARENT,mockTemplate2.fname,['/news']],
                    ['/art4',NO_PARENT,mockTemplate2.fname,['/news']],
                ],
                templates:[mockTemplate.fname,mockTemplate2.fname]
            }), 'should store the updated sitegraph to the database');
        });
        website.siteConfig.homeUrl = '/home';
    });
    testLib.test('removes a branch', function(assert) {
        assert.expect(3);
        siteGraph.parseAndLoadFrom(JSON.stringify({
            pages: [
                ['/home','',mockTemplate.fname,['/home','/home/books']],
                ['/home/books','/home',mockTemplate.fname,['/home','/home/books/a-book']],
                ['/home/books/a-book','/home/books',mockTemplate.fname,['/home','/home/books']],
            ],
            templates: [mockTemplate.fname]
        }));
        mockTemplate.contents = '<html><body>{'+
            '({'+
                '"home":' + makeLinks('/home') + // /home/books has disappeared
                ',"home/books":' + makeLinks('/home','/home/books/a-book') +
                ',"home/books/a-book":' + makeLinks('/home','/home/books') +
            '})[url.join("/")]'+
        '}</body></html>';
        website.website.compileAndCacheTemplate(mockTemplate.fname);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that removed /home/books and its child
        assert.ok(!siteGraph.getPage('/home/books'), 'Should remove /home/books');
        assert.ok(!siteGraph.getPage('/home/books/a-book'), 'Should remove /home/books/a-book');
        //
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[['/home','',mockTemplate.fname,['/home']]],
                templates:[mockTemplate.fname]
            }), 'should store the updated sitegraph to the database');
        });
    });
    testLib.test('swaps a parent page', function(assert) {
        assert.expect(3);
        website.siteConfig.homeUrl = '/starters';
        siteGraph.parseAndLoadFrom(JSON.stringify({
            pages: [
                ['/starters','',mockTemplate.fname,['/starters/dish1']],
                ['/starters/dish1','/starters',mockTemplate.fname,['/starters']],
                ['/main','',mockTemplate.fname,['/main/dish2']],
                ['/main/dish2','/main',mockTemplate.fname,['/main']],
            ],
            templates: [mockTemplate.fname]
        }));
        mockTemplate.contents = '<html><body>{'+
            '({'+
                '"starters":""' + // /starters/dish1 has disappeared
                ',"starters/dish1":' + makeLinks('/starters') +
                ',"main":' + makeLinks('/main/dish2','/main/dish1') + // main/dish1 has appeared
                ',"main/dish2":' + makeLinks('/main') +
                ',"main/dish1":' + makeLinks('/main') +
            '})[url.join("/")]'+
        '}</body></html>';
        website.website.compileAndCacheTemplate(mockTemplate.fname);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that removed /starters/dish1 and added /main/dish1
        assert.ok(!siteGraph.getPage('/starters/dish1'), 'Should remove /starters/dish1');
        var newDish1 = siteGraph.getPage('/main/dish1');
        assert.ok(newDish1 !== undefined, 'Should add /main/dish1');
        assert.equal(newDish1.parentUrl, '/main', 'Should update .parentUrl /starters -> /main');
        //
        commons.db.select('select `graph` from websites where id = ' + websiteData.id,
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages:[['/starters','',mockTemplate.fname,[]],
                       ['/main','',mockTemplate.fname,['/main/dish2','/main/dish1']],
                       ['/main/dish2','/main',mockTemplate.fname,['/main']],
                       ['/main/dish1','/main',mockTemplate.fname,['/main']]],
            }), 'should store the updated sitegraph to the database');
        });
        website.siteConfig.homeUrl = '/home';
    });
    testLib.test('follows new pages recursively', function(assert) {
        assert.expect(5);
        var linkAHref = '/bar';
        var linkBHref = '/nar';
        var commonAttrs = '" layoutOverride="'+mockTemplate.fname+'"';
        // Existing /foo contains a link to a new page /bar
        // New page /bar contains a link to another new page /nar
        mockTemplate.contents = '<html><body>{ url[0] == "foo" ? '+
            '<directives.Link to="' + linkAHref + commonAttrs + '/> : '+
            '<directives.Link to="' + linkBHref + commonAttrs + '/> }'+
        '</body></html>';
        var existingPage = siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname,
            {}, // Doesn't initially link anywhere
            1);
        var t1 = siteGraph.addTemplate(mockTemplate.fname, true);
        website.website.compileAndCacheTemplate(t1.fileName);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that added two new pages to website.siteGraph
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
                templates:[mockTemplate.fname]
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
        siteGraph.addTemplate(mockTemplate.fname, true);
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname);
        // Assert that didn't add '/'
        assert.ok(!siteGraph.getPage('/'), 'shouldn\'t add \'/\'');
        assert.equal(siteGraph.getPage('/home').refCount, refCountBefore,
            'Shouldn\'t increase refCount');
    });
});