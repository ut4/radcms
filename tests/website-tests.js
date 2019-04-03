const {Stub} = require('./main.js');
const {app} = require('../src/app.js');
const templateCache = require('../src/templating.js');

QUnit.module('[\'website.js\'].Website', hooks => {
    let tmplName1 = 'foo.jsx.htm';
    let tmplName2 = 'bar.jsx.htm';
    let website;
    let configLoadStub;
    let testSiteId = 2;
    hooks.before(() => {
        website = app.currentWebsite;
        website.config.homeUrl = '/home';
        configLoadStub = new Stub(website.config, 'loadFromDisk');
        if (website.db.prepare('insert into self values (?, ?)')
            .run(testSiteId, '{\"pages\":[[\"/home\",\"\",\"main-layout.jsx.htm\",[]]]}').changes < 1)
                throw new Error('Failed to insert test data');
    });
    hooks.after(() => {
        configLoadStub.restore();
        if (website.db.prepare('delete from self where `id` = ?').run(testSiteId).changes < 1)
            throw new Error('Failed to clean test data');
    });
    hooks.afterEach(() => {
        website.graph.clear();
    });
    QUnit.test('activate() reads&parses the site graph', assert => {
        //
        let readDirStub = new Stub(website.fs, 'readdirSync');
        //
        website.activate();
        assert.ok(!!website.graph.getPage('/home'), '/home',
                  'Should populate $this.graph');
        //
        readDirStub.restore();
    });
    QUnit.test('activate() reads&caches templates from disk', assert => {
        assert.expect(2);
        let mockFilesOnDisk = [{name:tmplName2,isDirectory:()=>false},
                               {name:tmplName1,isDirectory:()=>false}];
        let readDirStub = new Stub(website.fs, 'readdirSync', (_dir, _opts, onEach) => {
            mockFilesOnDisk.forEach(onEach);
        });
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

QUnit.module('[\'website.js\'].SiteConfig', hooks => {
    let config;
    hooks.before(() => {
        config = app.currentWebsite.config;
    });
    hooks.beforeEach(() => {
        config.contentTypes = [];
    });
    QUnit.test('loadFromDisk() reads and normalizes values', assert => {
        assert.expect(5);
        let fsReadStub = new Stub(config.fs, 'readFileSync', () =>
            '[Site]\nname=foo\nhomeUrl=noSlash\ndefaultLayout=fos.htm\n[ContentType:Test]\nkey=text'
        );
        //
        const testPath = '/some/path/';
        config.loadFromDisk(testPath,true);
        //
        assert.equal(fsReadStub.callInfo[0][0], testPath + 'site.ini');
        assert.equal(config.name, 'foo');
        assert.equal(config.homeUrl, '/noSlash');
        assert.equal(config.defaultLayout, 'fos.htm');
        assert.deepEqual(config.contentTypes[0],
            {name:'Test', fields: {key: 'text'}});
        //
        fsReadStub.restore();
    });
});
