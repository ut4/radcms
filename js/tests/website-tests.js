var commons = require('common-services.js');
var website = require('website.js');
var testLib = require('tests/testlib.js').testLib;

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