const {testEnv, Stub} = require('./env.js');
const {app} = require('../src/app.js');
const {templateCache} = require('../src/templating.js');
const {fileWatcher} = require('../src/common-services.js');
const {handleFWEvent} = require('../src/file-watchers.js');
const diff = require('../src/website-diff.js');

QUnit.module('resource-diff', hooks => {
    const mockCssFile = {url:'/styles/main.css', contents: 'p {}'};
    const mockJsFile = {url:'/foo.js', contents: 'const a;'};
    const mockTemplate = {fname:'test.jsx.htm', contents: ''};
    let website;
    let readFileStub;
    let sha1Stub;
    hooks.before(() => {
        testEnv.setupTestWebsite();
        website = app.currentWebsite;
        readFileStub = new Stub(website.fs, 'readFileSync', a => {
            if(a==website.dirPath+mockCssFile.url.substr(1)) return mockCssFile.contents;
            if(a==website.dirPath+mockJsFile.url.substr(1)) return mockJsFile.contents;
            if(a==website.dirPath+mockTemplate.fname) return mockTemplate.contents;
            throw new Error('');
        });
        sha1Stub = new Stub(diff, 'sha1', str => str);
        //
        website.graph.addPage('/foo', '', mockTemplate.fname, {}, 1);
        templateCache.put(mockTemplate.fname, () => {});
    });
    hooks.after(() => {
        readFileStub.restore();
        sha1Stub.restore();
        //
        website.graph.clear();
        templateCache.clear();
        //
        if (website.db.prepare('delete from uploadStatuses').run().changes < 1)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('discovers css/js from a modified template', assert => {
        assert.expect(4);
        mockTemplate.contents = '<html><body>'+
            '<link href="/non-existing.css" rel="stylesheet">' +
            '<link href="' + mockCssFile.url + '" rel="stylesheet">' +
            '<script src="' + mockJsFile.url.substr(1) + '"></script>' +
        '</body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        //
        const actuallyInsertedFiles = website.db
            .prepare('select * from assetFileRefs')
            .all();
        assert.equal(actuallyInsertedFiles.length, 3);
        assert.equal(actuallyInsertedFiles[0].fileUrl, '/non-existing.css');
        assert.equal(actuallyInsertedFiles[1].fileUrl, mockCssFile.url);
        assert.equal(actuallyInsertedFiles[2].fileUrl, mockJsFile.url);
        //
        if (website.db.prepare('delete from assetFileRefs').run().changes <
            actuallyInsertedFiles.length
        ) throw new Error('Failed to clean test data.');
    });
    QUnit.test('inserts missing checksums for existing css/js', assert => {
        assert.expect(1);
        const cssFileHash = diff.sha1(mockCssFile.contents);
        if (// Both files exists on disk ...
            website.db.prepare('insert into assetFiles values (?),(?)')
                      .run(mockCssFile.url, mockJsFile.url).changes < 1 ||
            // but only the first one has a uploadStatus
            website.db.prepare('insert into uploadStatuses values (?,?,null,1)')
                      .run(mockCssFile.url, cssFileHash) < 1)
            throw new Error('Failed to setup test data.');
        mockTemplate.contents = '<html><body>'+
            '<link href="' + mockCssFile.url + '" rel="stylesheet">' +
            '<script src="' + mockJsFile.url.substr(1) + '"></script>' +
        '</body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        //
        const actualStatus = website.db
            .prepare('select `curhash`,`uphash` from uploadStatuses where `url` = ?')
            .get(mockCssFile.url);
        assert.deepEqual(actualStatus, {curhash: cssFileHash, uphash: null},
            'Should insert a missing checksum');
        //
        if (website.db.prepare('delete from assetFileRefs').run().changes < 2)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('discovers ico/img from a modified template', assert => {
        assert.expect(3);
        mockTemplate.contents = '<html><body>'+
            '<link href="/icon.ico" rel="icon">' +
            '<img src="/pic.png">' +
        '</body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        //
        const actuallyInsertedFiles = website.db
            .prepare('select * from assetFileRefs')
            .all();
        assert.equal(actuallyInsertedFiles.length, 2);
        assert.equal(actuallyInsertedFiles[0].fileUrl, '/icon.ico');
        assert.equal(actuallyInsertedFiles[1].fileUrl, '/pic.png');
        //
        if (website.db.prepare('delete from assetFileRefs')
                      .run().changes < actuallyInsertedFiles.length)
            throw new Error('Failed to clean test data.');
    });
});