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
    });
    hooks.after(() => {
        readFileStub.restore();
        sha1Stub.restore();
    });
    hooks.afterEach(() => {
        website.graph.clear();
        templateCache.clear();
    });
    QUnit.test('spots new css/js from a modified template', assert => {
        assert.expect(13);
        website.graph.addPage('/foo', '', mockTemplate.fname, {}, 1);
        templateCache.put(mockTemplate.fname, () => {});
        mockTemplate.contents = '<html><body>'+
            '<link href="/non-existing.css" rel="stylesheet">' +
            '<link href="' + mockCssFile.url + '" rel="stylesheet">' +
            '<script src="' + mockJsFile.url.substr(1) + '"></script>' +
        '</body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        //
        const actuallyInsertedStatuses = website.db
            .prepare('select * from uploadStatuses where `isFile` = 1')
            .all();
        const actuallyInsertedFiles = website.db
            .prepare('select * from staticFileResources')
            .all();
        assert.equal(actuallyInsertedFiles.length, 3);
        assert.equal(actuallyInsertedFiles[0].url, '/non-existing.css');
        assert.equal(actuallyInsertedFiles[1].url, mockCssFile.url);
        assert.equal(actuallyInsertedFiles[2].url, mockJsFile.url);
        assert.equal(actuallyInsertedStatuses.length, 2,
            'should save the checksums of valid files to uploadStatuses');
        assert.equal(actuallyInsertedStatuses[0].url, mockCssFile.url);
        assert.equal(actuallyInsertedStatuses[0].curhash, mockCssFile.contents);
        assert.equal(actuallyInsertedStatuses[0].uphash, null);
        assert.equal(actuallyInsertedStatuses[0].isFile, 1);
        assert.equal(actuallyInsertedStatuses[1].url, mockJsFile.url);
        assert.equal(actuallyInsertedStatuses[1].curhash, mockJsFile.contents);
        assert.equal(actuallyInsertedStatuses[1].uphash, null);
        assert.equal(actuallyInsertedStatuses[1].isFile, 1);
        //
        if (website.db.prepare('delete from uploadStatuses').run().changes <
            actuallyInsertedStatuses.length
        ) throw new Error('Failed to clean test data.');
    });
});