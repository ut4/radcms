const {Stub, testEnv} = require('./env.js');
const {app} = require('../src/app.js');
const {templateCache} = require('../src/templating.js');
const {SiteConfig} = require('../src/website.js');

QUnit.module('[\'website.js\'].Website', hooks => {
    let tmplName1 = 'foo.jsx.htm';
    let tmplName2 = 'bar.jsx.htm';
    let website;
    let configLoadStub;
    let fileWatchStub;
    hooks.before(() => {
        testEnv.setupTestWebsite();
        website = app.currentWebsite;
        website.config.homeUrl = '/home';
        configLoadStub = new Stub(website.config, 'loadFromDisk');
        fileWatchStub = new Stub(website.fileWatcher, 'watch');
        if (website.db.prepare('insert into self values (1, ?)')
            .run('{\"pages\":[[\"/home\",\"\",\"main-layout.jsx.htm\",[]]]}').changes < 1)
                throw new Error('Failed to insert test data');
    });
    hooks.after(() => {
        configLoadStub.restore();
        fileWatchStub.restore();
        if (website.db.prepare('delete from self').run().changes < 1)
            throw new Error('Failed to clean test data');
    });
    hooks.afterEach(() => {
        website.graph.clear();
    });
    QUnit.test('activate() reads&parses the site graph', assert => {
        //
        let readDirStub = new Stub(website.fs, 'readdirSync', () => []);
        //
        website.activate();
        assert.ok(!!website.graph.getPage('/home'), '/home',
                  'Should populate $this.graph');
        //
        readDirStub.restore();
    });
    QUnit.test('activate() reads&caches templates from disk', assert => {
        assert.expect(2);
        let readDirStub = new Stub(website.fs, 'readdirSync', () =>
            [tmplName2, tmplName1]
        );
        let readTemplateStub = new Stub(website.fs, 'readFileSync', () =>
            '<p>hello</p>'
        );
        //
        app.currentWebsite.activate();
        assert.ok(templateCache.has(tmplName1),
            'Should add tmplsFromDisk[0] to templateCache');
        assert.ok(templateCache.has(tmplName2),
            'Should add tmplsFromDisk[1] to templateCache');
        //
        templateCache.remove(tmplName1);
        templateCache.remove(tmplName2);
        readDirStub.restore();
        readTemplateStub.restore();
    });
});

QUnit.module('[\'website.js\'].SiteConfig', () => {
    QUnit.test('loadFromDisk() reads and normalizes values', assert => {
        assert.expect(4);
        const config = new SiteConfig();
        let fsReadStub = new Stub(config.fs, 'readFileSync', () =>
            '[Site]\nname=foo\nhomeUrl=noSlash\ndefaultLayout=fos.htm'
        );
        //
        const testPath = '/some/path/';
        config.loadFromDisk(testPath);
        //
        assert.equal(fsReadStub.callInfo[0][0], testPath + 'site.ini');
        assert.equal(config.name, 'foo');
        assert.equal(config.homeUrl, '/noSlash');
        assert.equal(config.defaultLayout, 'fos.htm');
    });
});
