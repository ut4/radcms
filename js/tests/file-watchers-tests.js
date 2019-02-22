var fileWatchers = require('file-watchers.js');
var commons = require('common-services.js');
var website = require('website.js');
var siteGraph = website.siteGraph;
var fileWatcher = commons.fileWatcher;
var testLib = require('tests/testlib.js').testLib;
var NO_PARENT = '';

testLib.module('file-watchers.js', function(hooks) {
    var mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    var mockFiles = {};
    var websiteData = {id: 2, graph: ''};
    hooks.before(function() {
        website.website.fs = {
            read: function(a) {
                if(a==insnEnv.sitePath + mockTemplate.fname) return mockTemplate.contents;
                return mockFiles[a.replace(insnEnv.sitePath,'/')];
            }
        };
        website.website.crypto = {sha1: function(str) { return str; }};
        if (commons.db.insert('insert into websites values (?,?)', function(stmt) {
                stmt.bindInt(0, websiteData.id);
                stmt.bindString(1, websiteData.graph);
            }) < 1
        ) throw new Error('Failed to insert test data.');
        fileWatchers.init();
    });
    hooks.after(function() {
        website.website.fs = commons.fs;
        website.website.crypto = require('crypto.js');
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
        fileWatcher._watchFn(fileWatcher.EVENT_CREATE, mockTemplate.fname, 'htm');
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
    testLib.test('EVENT_CREATE <newFile>.css|js inserts the file to the db', function(assert) {
        assert.expect(6);
        var newCssFileName = '/foo.css';
        var newJsFileName = '/bar.js';
        var assertExistsInDb = function(expectCssFileExists, expectJsFile) {
            var cssFileInfo, jsFileInfo;
            commons.db.select('select `url`,`isOk` from staticFileResources\
                              where `url` in (?,?)',
                function(row) {
                    if (row.getString(0) == newCssFileName) cssFileInfo = row.getInt(1);
                    else jsFileInfo = row.getInt(1);
                },
                function(stmt) { stmt.bindString(0, newCssFileName);
                    stmt.bindString(1, newJsFileName); }
            );
            assert.equal(cssFileInfo, expectCssFileExists ? 0 : undefined);
            assert.equal(jsFileInfo, expectJsFile ? 0 : undefined);
        };
        assertExistsInDb(false, false);
        // Trigger handleFWEvent() and assert that inserted newCssFileName
        fileWatcher._watchFn(fileWatcher.EVENT_CREATE, newCssFileName.substr(1), 'css');
        assertExistsInDb(true, false);
        // same for the js file
        fileWatcher._watchFn(fileWatcher.EVENT_CREATE, newJsFileName.substr(1), 'js');
        assertExistsInDb(true, true);
        //
        if (commons.db.delete('delete from staticFileResources where url in(?,?)',
            function(stmt) {
                stmt.bindString(0, newCssFileName);
                stmt.bindString(1, newJsFileName);
            }) < 2) throw new Error('Failed to clean test data.');
    });
    testLib.test('EVENT_WRITE <existingLayout>.jsx.htm updates siteGraph.templates', function(assert) {
        assert.expect(1);
        siteGraph.addPage('/foo', NO_PARENT, mockTemplate.fname);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        var t = siteGraph.addTemplate(mockTemplate.fname, true);
        var cachedTemplateFnBefore = commons.templateCache.get(t.fileName); // undefined
        // Trigger handleFWEvent()
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, mockTemplate.fname, 'htm');
        // Assert that called templateCache.put(transpileToFn(newContents))
        assert.ok(commons.templateCache.get(t.fileName) !== cachedTemplateFnBefore,
            'Should cache the modified template');
    });
    testLib.test('EVENT_WRITE <existingFile>.css|js updates the files\' checksum', function(assert) {
        assert.expect(3);
        var notOkNotUploaded = '/foo.css';
        var okButNotUploaded = '/bar.js';
        var okAndUploaded = '/dir/baz.css';
        mockFiles[notOkNotUploaded] = 'foo';
        mockFiles[okButNotUploaded] = 'bar';
        mockFiles[okAndUploaded] = 'baz';
        if (commons.db.insert('insert into staticFileResources values (?,0),(?,1),(?,1)',
            function(stmt) {
                stmt.bindString(0, notOkNotUploaded);
                stmt.bindString(1, okButNotUploaded);
                stmt.bindString(2, okAndUploaded);
            }) < 1 ||
            commons.db.insert('insert into uploadStatuses values (?,?,?,?)',
            function(stmt) {
                stmt.bindString(0, okAndUploaded);
                stmt.bindString(1, mockFiles[okAndUploaded]);
                stmt.bindString(2, mockFiles[okAndUploaded]);
                stmt.bindInt(3, 1);
            }) < 1
        ) throw new Error('Failed to insert test data.');
        var assertChecksumEquals = function(expected) {
            var actual = [];
            commons.db.select('select us.*, sfr.`isOk` from uploadStatuses us \
                left join staticFileResources sfr on (sfr.`url` = us.`url`) \
                where us.`url` in (?,?,?)',
                function(row) {
                    actual.push({url: row.getString(0), curhash: row.getString(1),
                        uphash: row.getString(2), isFile: row.getInt(3),
                        isOk: row.getInt(4)});
                },
                function(stmt) {
                    stmt.bindString(0, notOkNotUploaded);
                    stmt.bindString(1, okButNotUploaded);
                    stmt.bindString(2, okAndUploaded);
                }
            );
            assert.deepEqual(actual, expected);
        };
        var expectedA = {url: notOkNotUploaded, curhash: mockFiles[notOkNotUploaded],
            uphash: null, isFile: 1, isOk: 1};
        var expectedB = {url: okButNotUploaded, curhash: mockFiles[okButNotUploaded],
            uphash: null, isFile: 1, isOk: 1};
        var expectedC = {url: okAndUploaded, curhash: mockFiles[okAndUploaded],
            uphash: mockFiles[okAndUploaded], isFile: 1, isOk: 1};
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, notOkNotUploaded.substr(1), 'css');
        assertChecksumEquals([expectedC,expectedA]);
        //
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, okButNotUploaded.substr(1), 'js');
        assertChecksumEquals([expectedB,expectedC,expectedA]);
        //
        mockFiles[okAndUploaded] = 'updated';
        fileWatcher._watchFn(fileWatcher.EVENT_WRITE, okAndUploaded.substr(1), 'css');
        expectedC.curhash = 'updated';
        assertChecksumEquals([expectedB,expectedC,expectedA]);
        //
        if (commons.db.delete('delete from uploadStatuses where `url` in(?,?,?)',
            function(stmt) {
                stmt.bindString(0, notOkNotUploaded);
                stmt.bindString(1, okButNotUploaded);
                stmt.bindString(2, okAndUploaded);
            }) < 3) throw new Error('Failed to clean test data.');
    });
    testLib.test('EVENT_REMOVE <existingLayout>.jsx.htm updates siteGraph.templates', function(assert) {
        assert.expect(2);
        siteGraph.addTemplate(mockTemplate.fname, true);
        var siteGraphBefore = siteGraph.serialize();
        //
        fileWatcher._watchFn(fileWatcher.EVENT_REMOVE, mockTemplate.fname, 'htm');
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
    testLib.test('EVENT_RENAME handles <file>.css|js', function(assert) {
        var notOkFrom = '/foo.css';
        var notOkTo = '/renamed.css';
        var okAndUploadedFrom = '/foo2.css';
        var okAndUploadedTo = '/renamed2.css';
        if (commons.db.insert('insert into staticFileResources values (?,0),(?,1)',
            function(stmt) {
                stmt.bindString(0, notOkFrom);
                stmt.bindString(1, okAndUploadedFrom);
            }) < 1 ||
            commons.db.insert('insert into uploadStatuses values (?,\'hash\',\'hash\',1)',
            function(stmt) {
                stmt.bindString(0, okAndUploadedFrom);
            }) < 1
        ) throw new Error('Failed to insert test data.');
        var assertStoredNewName = function(from, expected) {
            var actual = [];
            commons.db.select('select sfr.*,us.`url` from staticFileResources sfr \
                              left join uploadStatuses us on (us.`url`=sfr.`url`) \
                              where sfr.`url` in (?,?)',
                function(row) {
                    actual.push({url: row.getString(0), isOk: row.getInt(1),
                        uploadStatusesUrl: row.getString(2)});
                },
                function(stmt) {
                    stmt.bindString(0, from);
                    stmt.bindString(1, expected.url);
                }
            );
            assert.equal(actual.length, 1);
            assert.deepEqual(actual[0], expected);
        };
        fileWatcher.timer = {now: function() { return 1; }};
        //
        fileWatcher._watchFn(fileWatcher.EVENT_RENAME,
            notOkFrom.substr(1) + '>' + insnEnv.sitePath + notOkTo.substr(1), 'css');
        assertStoredNewName(notOkFrom, {url: notOkTo, isOk: 0, uploadStatusesUrl: null});
        //
        fileWatcher._watchFn(fileWatcher.EVENT_RENAME, okAndUploadedFrom.substr(1) +
            '>' + insnEnv.sitePath + okAndUploadedTo.substr(1), 'css');
        assertStoredNewName(okAndUploadedFrom, {url: okAndUploadedTo, isOk: 1,
            uploadStatusesUrl: okAndUploadedTo});
        //
        if (commons.db.delete('delete from uploadStatuses where `url` in(?,?)',
                function(stmt) {
                    stmt.bindString(0, okAndUploadedFrom);
                    stmt.bindString(1, okAndUploadedTo);
                }) < 1 ||
            commons.db.delete('delete from staticFileResources where `url` in(?,?)',
                function(stmt) {
                    stmt.bindString(0, notOkFrom);
                    stmt.bindString(1, notOkTo);
                }) < 1
        ) throw new Error('Failed to clean test data.');
        fileWatcher.timer = performance;
    });
});