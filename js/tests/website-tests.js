var commons = require('common-services.js');
var fileWatchers = require('file-watchers.js');
var website = require('website.js');
var testLib = require('tests/testlib.js').testLib;
var IS_OK = 1;
var IS_NOT_OK = 0;
var IS_IN_USE = 1;
var IS_NOT_IN_USE = 0;

testLib.module('[\'website.js\'].website', function(hooks) {
    var newTmplName = 'new.jsx.htm';
    var oldTmplName = 'existing.jsx.htm';
    var mockFilesOnDisk = [];
    hooks.before(function() {
        website.siteConfig.homeUrl = '/home';
        website.website.config = {loadFromDisk: function() {}};
        website.website.fs = {
            readDir: function(path, onEach) { mockFilesOnDisk.forEach(onEach); },
            read: function() { return '<p>hello</p>'; }
        };
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
            stmt.bindInt(0, 3);
            stmt.bindString(1, '...');
        }) < 1) throw new Error('Failed to insert test data.');
        fileWatchers.init();
    });
    hooks.after(function() {
        website.website.config = website.siteConfig;
        website.website.fs = website.fs;
        if (commons.db.delete('delete from websites where id = ?', function(stmt) {
            stmt.bindInt(0, 3);
        }) < 1) throw new Error('Failed to clean test data.');
        fileWatchers.clear();
    });
    hooks.afterEach(function() {
        website.siteGraph.clear();
    });
    testLib.test('init() spots new templates from disk', function(assert) {
        assert.expect(2);
        if (commons.db.update('update websites set `graph` = ? where id = ?', function(stmt) {
            stmt.bindString(0, JSON.stringify({
                pages: [['/home','',oldTmplName,[]]],
                templates: [[oldTmplName,IS_OK,IS_IN_USE]]
            }));
            stmt.bindInt(1, 3);
        }) < 1) throw new Error('Failed to insert test data.');
        //
        mockFilesOnDisk = [oldTmplName,newTmplName];
        website.website.init();
        assert.ok(website.siteGraph.getTemplate(newTmplName) !== undefined,
            'Should add the new template to website.siteGraph');
        commons.db.select('select `graph` from websites where id = 3',
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages: [['/home','',oldTmplName,[]]],
                templates:[[oldTmplName,IS_OK,IS_IN_USE],[newTmplName,IS_NOT_OK,IS_NOT_IN_USE]]
            }), 'should save changes to the database');
        });
    });
    testLib.test('init() spots deleted templates from disk', function(assert) {
        assert.expect(2);
        if (commons.db.update('update websites set `graph` = ? where id = ?', function(stmt) {
            stmt.bindString(0, JSON.stringify({
                pages: [['/home','',oldTmplName,[]]],
                templates: [[oldTmplName,IS_OK,IS_IN_USE]]
            }));
            stmt.bindInt(1, 3);
        }) < 1) throw new Error('Failed to insert test data.');
        //
        mockFilesOnDisk = []; // oldTmplName has disappeared
        website.website.init();
        assert.ok(!website.siteGraph.getTemplate(newTmplName),
            'Should remove the deleted template from website.siteGraph');
        commons.db.select('select `graph` from websites where id = 3',
            function(row) {
            assert.equal(row.getString(0), JSON.stringify({
                pages: [['/home','',oldTmplName,[]]],
                templates:[]
            }), 'should save changes to the database');
        });
    });
});

testLib.module('[\'website.js\'].siteConfig', function(hooks) {
    hooks.beforeEach(function() {
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
    });
});