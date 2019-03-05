var app = require('app.js').app;
var commons = require('common-services.js');
var fileWatchers = require('file-watchers.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('[\'website.js\'].Website', function(hooks) {
    var tmplName1 = 'foo.jsx.htm';
    var tmplName2 = 'bar.jsx.htm';
    var mockFilesOnDisk = [];
    var website;
    var origWebsiteConfig;
    hooks.before(function() {
        website = app.currentWebsite;
        website.config.homeUrl = '/home';
        origWebsiteConfig = website.config;
        app.currentWebsite.config = {loadFromDisk: function() {}};
        app.currentWebsite.fs = {
            readDir: function(path, onEach) { mockFilesOnDisk.forEach(onEach); },
            read: function() { return '<p>hello</p>'; }
        };
        fileWatchers.init();
    });
    hooks.after(function() {
        app.currentWebsite.config = origWebsiteConfig;
        app.currentWebsite.fs = website.fs;
        fileWatchers.clear();
    });
    hooks.afterEach(function() {
        app.currentWebsite.graph.clear();
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

testLib.module('[\'website.js\'].SiteConfig', function(hooks) {
    var website;
    hooks.before(function() {
        website = app.currentWebsite;
    });
    hooks.beforeEach(function() {
        website.config.contentTypes = [];
    });
    testLib.test('loadFromDisk() reads and normalizes values', function(assert) {
        assert.expect(3);
        commons.fs.write(website.dirPath + 'site.ini',
            '[Site]\nname=foo\nhomeUrl=noSlash\n[ContentType:Test]\nkey=text');
        website.config.loadFromDisk(website.dirPath);
        assert.equal(website.config.name, 'foo');
        assert.equal(website.config.homeUrl, '/noSlash');
        assert.deepEqual(website.config.contentTypes[0],
            {name:'Test', fields: {key: 'text'}});
    });
    testLib.test('loadFromDisk() validates values', function(assert) {
        assert.expect(1);
        commons.fs.write(website.dirPath + 'site.ini',
            '[ContentType:Test]\nkey=fus');
        try {
            website.config.loadFromDisk(website.dirPath);
        } catch (e) {
            assert.equal(e.message, '\'fus\' is not valid datatype.\n');
        }
    });
});