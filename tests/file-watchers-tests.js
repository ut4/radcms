const {testEnv, Stub} = require('./env.js');
const {app} = require('../src/app.js');
const {templateCache} = require('../src/templating.js');
const {fileWatcher} = require('../src/common-services.js');
const {handleFWEvent} = require('../src/file-watchers.js');
const diff = require('../src/website-diff.js');

QUnit.module('file-watchers.js', hooks => {
    const mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    const mockFiles = {};
    let website;
    let readFileStub;
    let sha1Stub;
    hooks.before(() => {
        testEnv.setupTestWebsite();
        website = app.currentWebsite;
        readFileStub = new Stub(website.fs, 'readFileSync', a => {
            if(a==website.dirPath + mockTemplate.fname) return mockTemplate.contents;
            return mockFiles[a.replace(website.dirPath,'/')];
        });
        sha1Stub = new Stub(diff, 'sha1', str => str);
        if (website.db.prepare('insert into self values (2,\'\')').run().changes < 1)
            throw new Error('Failed to insert test data.');
    });
    hooks.after(() => {
        readFileStub.restore();
        sha1Stub.restore();
        if (website.db.prepare('delete from self').run().changes < 1)
            throw new Error('Failed to clean test data.');
    });
    hooks.afterEach(() => {
        website.graph.clear();
        templateCache.clear();
    });
    QUnit.test('EVENT_ADD <newFile>.css|js inserts the file to the db', assert => {
        assert.expect(6);
        const newCssFileName = '/foo.css';
        const newJsFileName = '/bar.js';
        const assertExistsInDb = (expectCssFileExists, expectJsFile) => {
            let cssFileInfo, jsFileInfo;
            website.db.prepare('select `url`,`isOk` from staticFileResources\
                              where `url` in (?,?)').all(newCssFileName,newJsFileName)
                .forEach(row => {
                    if (row.url == newCssFileName) cssFileInfo = row.isOk;
                    else jsFileInfo = row.isOk;
                });
            assert.equal(cssFileInfo, expectCssFileExists ? 0 : undefined);
            assert.equal(jsFileInfo, expectJsFile ? 0 : undefined);
        };
        assertExistsInDb(false, false);
        // Trigger handleFWEvent() and assert that inserted newCssFileName
        handleFWEvent(fileWatcher.EVENT_ADD, newCssFileName.substr(1));
        assertExistsInDb(true, false);
        // same for the js file
        handleFWEvent(fileWatcher.EVENT_ADD, newJsFileName.substr(1), 'js');
        assertExistsInDb(true, true);
        //
        if (website.db.prepare('delete from staticFileResources where url in(?,?)')
                .run(newCssFileName, newJsFileName).changes < 2)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('EVENT_CHANGE <template>.jsx.htm caches the file', assert => {
        assert.expect(1);
        mockTemplate.contents = '<html><body>Hello</body></html>';
        const cachedTemplateFnBefore = templateCache.get(mockTemplate.fname); // undefined
        // Trigger handleFWEvent()
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname, 'htm');
        // Assert that called templateCache.put(transpileToFn(newContents))
        assert.ok(templateCache.get(mockTemplate.fname) !== cachedTemplateFnBefore,
            'Should cache the modified template');
    });
    QUnit.test('EVENT_CHANGE <existingFile>.css|js updates checksums', assert => {
        assert.expect(3);
        const notOkNotUploaded = '/foo.css';
        const okButNotUploaded = '/bar.js';
        const okAndUploaded = '/dir/baz.css';
        mockFiles[notOkNotUploaded] = 'foo';
        mockFiles[okButNotUploaded] = 'bar';
        mockFiles[okAndUploaded] = 'baz';
        if (website.db.prepare('insert into staticFileResources values (?,0),(?,1),(?,1)').run(
                notOkNotUploaded,
                okButNotUploaded,
                okAndUploaded
            ).changes < 1 ||
            website.db.prepare('insert into uploadStatuses values (?,?,?,1)').run(
                okAndUploaded,
                mockFiles[okAndUploaded],
                mockFiles[okAndUploaded]
            ).changes < 1
        ) throw new Error('Failed to insert test data.');
        const assertChecksumEquals = expected => {
            const actual = website.db.prepare('select us.*, sfr.`isOk` from uploadStatuses us \
                left join staticFileResources sfr on (sfr.`url` = us.`url`) \
                where us.`url` in (?,?,?)').raw()
                .all(notOkNotUploaded, okButNotUploaded, okAndUploaded)
                .map(row =>
                    ({url: row[0], curhash: row[1], uphash: row[2],
                      isFile: row[3], isOk: row[4]})
                );
            assert.deepEqual(actual, expected);
        };
        const expectedA = {url: notOkNotUploaded, curhash: mockFiles[notOkNotUploaded],
            uphash: null, isFile: 1, isOk: 1};
        const expectedB = {url: okButNotUploaded, curhash: mockFiles[okButNotUploaded],
            uphash: null, isFile: 1, isOk: 1};
        const expectedC = {url: okAndUploaded, curhash: mockFiles[okAndUploaded],
            uphash: mockFiles[okAndUploaded], isFile: 1, isOk: 1};
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, notOkNotUploaded.substr(1));
        assertChecksumEquals([expectedC,expectedA]);
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, okButNotUploaded.substr(1));
        assertChecksumEquals([expectedB,expectedC,expectedA]);
        //
        mockFiles[okAndUploaded] = 'updated';
        handleFWEvent(fileWatcher.EVENT_CHANGE, okAndUploaded.substr(1));
        expectedC.curhash = 'updated';
        assertChecksumEquals([expectedB,expectedC,expectedA]);
        //
        if (website.db.prepare('delete from uploadStatuses where `url` in(?,?,?)').run(
                notOkNotUploaded,
                okButNotUploaded,
                okAndUploaded
            ).changes < 3) throw new Error('Failed to clean test data.');
    });
    QUnit.test('EVENT_UNLINK <existingTemplate>.jsx.htm uncaches the file', assert => {
        assert.expect(2);
        templateCache.put(mockTemplate.fname, () => {});
        assert.ok(templateCache.get(mockTemplate.fname) !== undefined);
        //
        handleFWEvent(fileWatcher.EVENT_UNLINK, mockTemplate.fname);
        //
        assert.ok(templateCache.get(mockTemplate.fname) === undefined,
            'Should uncache the file');
    });
    QUnit.test('EVENT_REMOVE handles <existingFile>.css|js', assert => {
        assert.expect(2);
        const okButNotUploaded = '/foo.css';
        const okAndUploaded = '/bar.js';
        if (website.db.prepare('insert into staticFileResources values (?,1),(?,1)')
                      .run(okButNotUploaded, okAndUploaded).changes < 1 ||
            website.db.prepare('insert into uploadStatuses values (?,\'hash\',\'hash\',1)')
                      .run(okAndUploaded).changes < 1)
            throw new Error('Failed to insert test data.');
        const assertChecksumEquals = (fileUrl, expected, message) => {
            const actual = website.db.prepare('select us.*,sfr.`url` from uploadStatuses us \
                left join staticFileResources sfr on (sfr.`url` = us.`url`) \
                where us.`url` = ?').raw().all(fileUrl).map(row =>
                    ({url: row[0], curhash: row[1], uphash: row[2],
                      isFile: row[3], staticFileTableUrl: row[4]})
                );
            assert.deepEqual(actual, expected, message);
        };
        //
        handleFWEvent(fileWatcher.EVENT_UNLINK, okButNotUploaded.substr(1));
        assertChecksumEquals(okButNotUploaded, [],
            'Should wipe completely if the file isn\'t uploaded');
        //
        handleFWEvent(fileWatcher.EVENT_UNLINK, okAndUploaded.substr(1));
        assertChecksumEquals(okAndUploaded, [{url: okAndUploaded, curhash: null,
            uphash: 'hash', isFile: 1, staticFileTableUrl: null}],
            'Should mark as removed if the file is uploaded');
        //
        if (website.db.prepare('delete from uploadStatuses where `url` = ?')
                      .run(okAndUploaded).changes < 1)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('EVENT_RENAME handles <existingTemplate>.jsx.htm', assert => {
        assert.expect(12);
        const noUsersFrom = 'foo.jsx.htm';
        const noUsersTo = 'newfoo.jsx.htm';
        const hasUsersFrom = 'bar.jsx.htm';
        const hasUsersTo = 'newbar.jsx.htm';
        const testUser = '/a-page';
        const testUser2 = '/a-page2';
        website.graph.addPage(testUser, '', hasUsersFrom, {}, 1);
        website.graph.addPage(testUser2, '', hasUsersFrom, {}, 1);
        templateCache.put(noUsersFrom, () => {});
        templateCache.put(hasUsersFrom, () => {});
        const assertSwappedTheTemplate = (from, to) => {
            assert.ok(!templateCache.get(from),
                'Should remove the old layout');
            assert.ok(templateCache.get(to) !== undefined,
                'Should replace the old layout');
            assert.ok(!templateCache.has(from),
                'Should remove the old entry from the templateCache');
            assert.ok(templateCache.has(to),
                'Should replace the cached template function');
        };
        //
        handleFWEvent(fileWatcher.EVENT_RENAME, noUsersFrom + '>' + noUsersTo);
        assertSwappedTheTemplate(noUsersFrom, noUsersTo);
        const row = website.db.prepare('select `graph` from self').get();
        assert.equal(row.graph, '');
        //
        handleFWEvent(fileWatcher.EVENT_RENAME, hasUsersFrom + '>' + hasUsersTo);
        assertSwappedTheTemplate(hasUsersFrom, hasUsersTo);
        assert.equal(website.graph.getPage(testUser).layoutFileName, hasUsersTo,
            'Should update the new name to siteGraph.pages');
        assert.equal(website.graph.getPage(testUser2).layoutFileName, hasUsersTo,
            'Should update the new name to siteGraph.pages');
        const row2 = website.db.prepare('select `graph` from self').get();
        assert.equal(row2.graph, JSON.stringify({
            pages:[[testUser,'',hasUsersTo,[]],
                   [testUser2,'',hasUsersTo,[]]]
        }));
    });
    QUnit.test('EVENT_RENAME handless <file>.css|js', assert => {
        const notOkFrom = '/foo.css';
        const notOkTo = '/renamed.css';
        const okAndUploadedFrom = '/foo2.css';
        const okAndUploadedTo = '/renamed2.css';
        if (website.db.prepare('insert into staticFileResources values (?,0),(?,1)')
                      .run(notOkFrom, okAndUploadedFrom).changes < 1 ||
            website.db.prepare('insert into uploadStatuses values (?,\'hash\',\'hash\',1)')
                      .run(okAndUploadedFrom).changes < 1)
            throw new Error('Failed to insert test data.');
        const assertStoredNewName = (from, expected) => {
            const actual = website.db.prepare('select sfr.*,us.`url` from staticFileResources sfr \
                left join uploadStatuses us on (us.`url`=sfr.`url`) \
                where sfr.`url` in (?,?)').raw().all(from, expected.url).map(row =>
                    ({url: row[0], isOk: row[1], uploadStatusesUrl: row[2]})
                );
            assert.equal(actual.length, 1);
            assert.deepEqual(actual[0], expected);
        };
        //
        handleFWEvent(fileWatcher.EVENT_RENAME, notOkFrom.substr(1) + '>' +
            notOkTo.substr(1));
        assertStoredNewName(notOkFrom, {url: notOkTo, isOk: 0, uploadStatusesUrl: null});
        //
        handleFWEvent(fileWatcher.EVENT_RENAME, okAndUploadedFrom.substr(1) +
            '>' + okAndUploadedTo.substr(1));
        assertStoredNewName(okAndUploadedFrom, {url: okAndUploadedTo, isOk: 1,
            uploadStatusesUrl: okAndUploadedTo});
        //
        if (website.db.prepare('delete from uploadStatuses where `url` in(?,?)')
                      .run(okAndUploadedFrom, okAndUploadedTo).changes < 1 ||
            website.db.prepare('delete from staticFileResources where `url` in(?,?)')
                      .run(notOkFrom, notOkTo).changes < 1)
            throw new Error('Failed to clean test data.');
    });
});