const {testEnv, Stub} = require('./env.js');
const {app} = require('../src/app.js');
const {templateCache} = require('../src/templating.js');
const {fileWatcher} = require('../src/common-services.js');
const {handleFWEvent} = require('../src/file-watchers.js');
const diff = require('../src/website-diff.js');

QUnit.module('page-diff', hooks => {
    const mockTemplate = {fname:'test.jsx.htm', contents: '<html><body></body></html>'};
    let homePage;
    let website;
    let siteGraph;
    let readFileStub;
    let sha1Stub;
    hooks.before(() => {
        testEnv.setupTestWebsite();
        testEnv.setupDirectives();
        website = app.currentWebsite;
        siteGraph = website.graph;
        homePage = siteGraph.addPage('/home', '', mockTemplate.fname, {}, 1);
        templateCache.put(mockTemplate.fname, () => {});
        website.config.defaultLayout = mockTemplate.fname;
        readFileStub = new Stub(website.fs, 'readFileSync', a => {
            if(a==website.dirPath+mockTemplate.fname) return mockTemplate.contents;
        });
        sha1Stub = new Stub(diff, 'sha1', str => str);
    });
    hooks.after(() => {
        readFileStub.restore();
        sha1Stub.restore();
        siteGraph.clear();
    });
    hooks.afterEach(() => {
        templateCache.clear();
    });
    QUnit.test('saves the checksums of new pages', assert => {
        assert.expect(3);
        const newPage = {url: '/bar'};
        const expectedNewPageChkSum = diff.sha1('<html><body>Hello</body></html>');
        const homePageChkSum = diff.sha1('<html><body><a href="' + newPage.url +
            '"></a></body></html>');
        mockTemplate.contents = '<html><body>{'+
            'url[0] == "home" ? <RadLink to="' + newPage.url + '"/> : "Hello"' +
        '}</body></html>';
        if (website.db.prepare('insert into uploadStatuses values (?,?,null,0)')
                      .run(homePage.url, homePageChkSum).changes < 1)
            throw new Error('Failed to setup test data');
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        //
        const uploadStatuses = website.db
            .prepare('select * from uploadStatuses where `isFile` = 0')
            .all();
        assert.equal(uploadStatuses.length, 2);
        const existing = uploadStatuses[0];
        assert.deepEqual(existing, {url: homePage.url, curhash: homePageChkSum,
            uphash: null, isFile: 0}, 'Shouldn\'t modify old statuses');
        const inserted = uploadStatuses[1];
        assert.deepEqual(inserted, {url: newPage.url, curhash: expectedNewPageChkSum,
            uphash: null, isFile: 0});
        //
        homePage.linksTo = {};
        delete siteGraph.pages[newPage.url];
        if (website.db.prepare('delete from uploadStatuses where `url` in (?,?)')
                      .run(homePage.url, newPage.url).changes < 2)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('updates the checksums of modified pages', assert => {
        assert.expect(2);
        const oldChkSum = diff.sha1('<html><body>Fus</body></html>');
        const newChkSum = diff.sha1('<html><body>sss</body></html>');
        mockTemplate.contents = '<html><body>{"s"}ss</body></html>';
        if (website.db.prepare('insert into uploadStatuses values (?,?,null,0)')
                      .run(homePage.url, oldChkSum).changes < 1)
            throw new Error('Failed to setup test data');
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname, 'htm');
        //
        const uploadStatuses = website.db
            .prepare('select * from uploadStatuses where `isFile` = 0')
            .all();
        assert.equal(uploadStatuses.length, 1);
        const newStatus = uploadStatuses[0];
        assert.deepEqual(newStatus, {url: homePage.url, curhash: newChkSum,
            uphash: null, isFile: 0}, 'Should update the checksum');
        //
        if (website.db.prepare('delete from uploadStatuses where `url` = ?')
                      .run(homePage.url).changes < 1)
            throw new Error('Failed to reset test data.');
    });
    QUnit.test('updates or deletes the checksums of removed pages', assert => {
        assert.expect(2);
        homePage.linksTo = {'/foo': 1, '/bar': 1};
        const removedPage = siteGraph.addPage('/foo', '', mockTemplate.fname, {}, 1);
        const removedUploadedPage = siteGraph.addPage('/bar', '', mockTemplate.fname, {}, 1);
        mockTemplate.contents = '<html><body>both links gone</body></html>';
        if (website.db.prepare('insert into uploadStatuses values (?,?,?,0),\
            (?,\'foo\',null,0),(?,\'foo\',\'foo\',0)').run(
                homePage.url,
                diff.sha1(mockTemplate.contents),
                diff.sha1(mockTemplate.contents),
                removedPage.url,
                removedUploadedPage.url
            ).changes < 1) throw new Error('Failed to setup test data');
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname, 'htm');
        //
        const uploadStatuses = website.db
            .prepare('select * from uploadStatuses where `isFile`=0 and `url`!=?')
            .all(homePage.url);
        const status = uploadStatuses[0];
        assert.deepEqual(status, {url: removedUploadedPage.url, curhash: null,
            uphash: 'foo', isFile: 0},
            'Should clear the checksum of the uploaded removed page');
        assert.ok(uploadStatuses[1] === undefined,
            'Should remove the non-uploaded page completely');
        //
        homePage.linksTo = {};
        if (website.db.prepare('delete from uploadStatuses where `url` in (?,?)')
                .run(homePage.url, removedUploadedPage.url).changes < 2)
            throw new Error('Failed to reset test data.');
    });
});