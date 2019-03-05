var app = require('app.js').app;
var commons = require('common-services.js');
var fileWatchers = require('file-watchers.js');
var website = require('website.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('[\'website.js\'].website', function(hooks) {
    var tmplName1 = 'foo.jsx.htm';
    var tmplName2 = 'bar.jsx.htm';
    var mockFilesOnDisk = [];
    hooks.before(function() {
        website.siteConfig.homeUrl = '/home';
        app.currentWebsite.config = {loadFromDisk: function() {}};
        app.currentWebsite.fs = {
            readDir: function(path, onEach) { mockFilesOnDisk.forEach(onEach); },
            read: function() { return '<p>hello</p>'; }
        };
        fileWatchers.init();
    });
    hooks.after(function() {
        app.currentWebsite.config = website.siteConfig;
        app.currentWebsite.fs = website.fs;
        fileWatchers.clear();
    });
    hooks.afterEach(function() {
        app.currentWebsite.siteGraph.clear();
    });
    testLib.test('init() reads&caches templates from disk', function(assert) {
        assert.expect(2);
        //
        mockFilesOnDisk = [tmplName2,tmplName1];
        app.currentWebsite.init();
        assert.ok(commons.templateCache.has(tmplName1),
            'Should add tmplsFromDisk[0] to templateCache');
        assert.ok(commons.templateCache.has(tmplName2),
            'Should add tmplsFromDisk[1] to templateCache');
    });
});

testLib.module('[\'website.js\'].siteConfig', function(hooks) {
    /*hooks.beforeEach(function() {
        website.siteConfig.contentTypes = [];
    });
    testLib.test('loadFromDisk() reads and normalizes values', function(assert) {
        assert.expect(3);
        commons.fs.write(insnEnv.sitePath + 'site.ini',
            '[Site]\nname=foo\nhomeUrl=noSlash\n[ContentType:Test]\nkey=text');
        website.siteConfig.loadFromDisk();
        assert.equal(website.siteConfig.name, 'foo');
        assert.equal(website.siteConfig.homeUrl, '/noSlash');
        assert.deepEqual(website.siteConfig.contentTypes[0],
            {name:'Test', fields: {key: 'text'}});
    });
    testLib.test('loadFromDisk() validates values', function(assert) {
        assert.expect(1);
        commons.fs.write(insnEnv.sitePath + 'site.ini',
            '[ContentType:Test]\nkey=fus');
        try {
            website.siteConfig.loadFromDisk();
        } catch (e) {
            assert.equal(e.message, '\'fus\' is not valid datatype.\n');
        }
    });*/
});