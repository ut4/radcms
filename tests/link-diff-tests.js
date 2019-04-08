const {testEnv, Stub} = require('./env.js');
const {app} = require('../src/app.js');
const {templateCache} = require('../src/templating.js');
const diff = require('../src/website-diff.js');
const {fileWatcher} = require('../src/common-services.js');
const {handleFWEvent} = require('../src/file-watchers.js');

const getGraphSql = 'select `graph` from self where id = ?';
const makeLinks = (...urls) =>
    '[' + urls.map(url =>
        '<RadLink to="' + url + '"/>'
    ) + ']';

QUnit.module('link-diff', hooks => {
    const mockTemplate = {fname:'template-a.jsx.htm', contents:null};
    const mockTemplate2 = {fname:'template-b.jsx.htm', contents:null};
    const websiteData = {id: 3, graph: ''};
    const originalRemoteDiff = diff.RemoteDiff;
    let website;
    let siteGraph;
    let readFileStub;
    hooks.before(() => {
        testEnv.setupTestWebsite();
        testEnv.setupDirectives();
        website = app.currentWebsite;
        siteGraph = website.graph;
        diff.RemoteDiff = function() {};
        diff.RemoteDiff.prototype.addPageToCheck = () => {};
        diff.RemoteDiff.prototype.addFileToCheck = () => {};
        diff.RemoteDiff.prototype.addPageToDelete = () => {};
        diff.RemoteDiff.prototype.saveStatusesToDb = () => {};
        website.config.homeUrl = '/home';
        website.config.defaultLayout = mockTemplate.fname;
        readFileStub = new Stub(website.fs, 'readFileSync', a => {
            if(a==website.dirPath+mockTemplate.fname) return mockTemplate.contents;
            if(a==website.dirPath+mockTemplate2.fname) return mockTemplate2.contents;
        });
        if (website.db.prepare('insert into self values (?,?)')
                      .run(websiteData.id, websiteData.graph).changes < 1)
            throw new Error('Failed to insert test data.');
    });
    hooks.after(() => {
        diff.RemoteDiff = originalRemoteDiff;
        readFileStub.restore();
        if (website.db.prepare('delete from self where id = ?')
                      .run(websiteData.id).changes < 1 ||
            website.db.prepare('delete from uploadStatuses')
                      .run().changes < 1)
            throw new Error('Failed to clean test data.');
    });
    hooks.afterEach(() => {
        siteGraph.clear();
        templateCache.clear();
    });
    QUnit.test('spots a new link from a modified template', assert => {
        assert.expect(2);
        const existingPage = siteGraph.addPage('/foo', '', mockTemplate.fname, {}, 1);
        templateCache.put(mockTemplate.fname, () => {});
        const newLinkUrl = '/bar';
        mockTemplate.contents = '<html><body>'+
            '<RadLink to="' + newLinkUrl + '"/>' +
            '<RadLink to="' + newLinkUrl + '"/>'+ // dupes shouldn't matter
        '</body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        // Assert that added the page to website.graph
        const addedPage = siteGraph.getPage(newLinkUrl);
        assert.ok(addedPage !== undefined, 'should add a page to website.graph');
        // Assert that saved the updated site graph to the database
        const row = website.db.prepare(getGraphSql).get(websiteData.id);
        assert.equal(row.graph, JSON.stringify({
            pages:[
                [existingPage.url,'',mockTemplate.fname,[newLinkUrl]],
                [newLinkUrl,'',mockTemplate.fname,[newLinkUrl]]
            ]
        }), 'should store the updated site graph to the database');
    });
    QUnit.test('spots a removed link from a modified template', assert => {
        assert.expect(2);
        const refCount = 1;
        const existingPage1 = siteGraph.addPage('/foo', '', mockTemplate.fname, {'/bar': 1}, 1);
        const existingPage2 = siteGraph.addPage('/bar', '', mockTemplate.fname, {}, refCount);
        templateCache.put(mockTemplate.fname, function() {});
        mockTemplate.contents = '<html><body>' +
            // a link has disappeared
        '</body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        // Assert that removed the page to website.graph
        assert.ok(!siteGraph.getPage(existingPage2), 'Should remove a page from website.graph');
        // Assert that saved the updated site graph to the database
        const row = website.db.prepare(getGraphSql).get(websiteData.id);
        assert.equal(row.graph, JSON.stringify({
            pages:[
                [existingPage1.url,'',mockTemplate.fname,[]]
            ]
        }), 'should store the updated site graph to the database');
    });
    QUnit.test('doesn\'t remove pages that still have references somewhere', assert => {
        assert.expect(2);
        const refCount = 2;
        const existingPage1 = siteGraph.addPage('/foo', '', mockTemplate.fname, {'/bar': 1}, 1);
        const existingPage2 = siteGraph.addPage('/bar', '', mockTemplate.fname, {}, refCount);
        templateCache.put(mockTemplate.fname, function() {});
        mockTemplate.contents = '<html><body></body></html>';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        // Assert that didn't remove the page
        assert.equal(siteGraph.getPage(existingPage2.url), existingPage2,
            'Should not remove the page');
        // Assert that saved the updated site graph to the database
        const row = website.db.prepare(getGraphSql).get(websiteData.id);
        assert.equal(row.graph, JSON.stringify({
            pages:[
                [existingPage1.url,'',mockTemplate.fname,[]],
                [existingPage2.url,'',mockTemplate.fname,[]]
            ]
        }), 'should store the updated site graph to the database');
    });
    QUnit.test('swaps a parent page', assert => {
        assert.expect(4);
        siteGraph.parseAndLoadFrom(JSON.stringify({
            pages: [
                ['/home','',mockTemplate.fname,['/starters','/desserts']],
                ['/starters','',mockTemplate.fname,['/starters/dish1']],
                ['/starters/dish1','/starters',mockTemplate.fname,['/starters']],
                ['/desserts','',mockTemplate.fname,['/desserts/dish2']],
                ['/desserts/dish2','/desserts',mockTemplate.fname,['/desserts']],
            ]
        }), '/home');
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
        website.compileAndCacheTemplate(mockTemplate.fname);
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        // Assert that removed /starters/dish1 and added /desserts/dish1
        assert.ok(!siteGraph.getPage('/starters/dish1'), 'Should remove /starters/dish1');
        const newDish1 = siteGraph.getPage('/desserts/dish1');
        assert.ok(newDish1 !== undefined, 'Should add /desserts/dish1');
        assert.equal(newDish1.parentUrl, '/desserts', 'Should update .parentUrl /starters -> /desserts');
        //
        const row = website.db.prepare(getGraphSql).get(websiteData.id);
        assert.equal(row.graph, JSON.stringify({
            pages:[['/home','',mockTemplate.fname,['/starters','/desserts']],
                    ['/starters','',mockTemplate.fname,[]],
                    ['/desserts','',mockTemplate.fname,['/desserts/dish2','/desserts/dish1']],
                    ['/desserts/dish2','/desserts',mockTemplate.fname,['/desserts']],
                    ['/desserts/dish1','/desserts',mockTemplate.fname,['/desserts']]]
        }), 'should store the updated site graph to the database');
    });
    QUnit.test('follows new pages recursively', assert => {
        assert.expect(5);
        const linkAHref = '/bar';
        const linkBHref = '/nar';
        const commonAttrs = '" layoutOverride="' + mockTemplate.fname + '"';
        // Existing /foo contains a link to a new page /bar
        // New page /bar contains a link to another new page /nar
        mockTemplate.contents = '<html><body>{ url[0] == "foo" ? '+
            '<RadLink to="' + linkAHref + commonAttrs + '/> : '+
            '<RadLink to="' + linkBHref + commonAttrs + '/> }'+
        '</body></html>';
        const existingPage = siteGraph.addPage('/foo', '', mockTemplate.fname,
            {}, // Doesn't initially link anywhere
            1);
        website.compileAndCacheTemplate(mockTemplate.fname);
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname);
        // Assert that added two new pages to website.graph
        const added1 = siteGraph.getPage(linkAHref);
        assert.ok(added1 !== undefined, 'should add page #1 to website.graph');
        assert.equal(added1.url, '/bar');
        const added2 = siteGraph.getPage(linkBHref);
        assert.ok(added2 !== undefined, 'should add page #2 to website.graph');
        assert.equal(added2.url, '/nar');
        // Assert that saved the updated site graph to the database
        const row = website.db.prepare(getGraphSql).get(websiteData.id);
        assert.equal(row.graph, JSON.stringify({
            pages: [
                [existingPage.url,'',mockTemplate.fname,[linkAHref]],
                [linkAHref,'',mockTemplate.fname,[linkBHref]],
                [linkBHref,'',mockTemplate.fname,[linkBHref]]
            ]
        }), 'should store the updated site graph to the database');
    });
    QUnit.test('doesn\'t add aliases (<Link to="/"/>)', assert => {
        assert.expect(2);
        mockTemplate.contents = '<html><body>'+
            '<RadLink to="/"/>'+
        '</body></html>';
        const existingPage = siteGraph.addPage('/home', '', mockTemplate.fname);
        const refCountBefore = existingPage.refCount;
        website.config.homeUrl = '/home';
        //
        handleFWEvent(fileWatcher.EVENT_CHANGE, mockTemplate.fname, 'htm');
        // Assert that didn't add '/'
        assert.ok(!siteGraph.getPage('/'), 'shouldn\'t add \'/\'');
        assert.equal(siteGraph.getPage('/home').refCount, refCountBefore,
            'Shouldn\'t increase refCount');
    });
});
