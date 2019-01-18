var commons = require('common-services.js');
var website = require('website.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('[\'website.js\'].siteConfig', function(hooks) {
    hooks.beforeEach(function() {
        website.siteConfig.componentTypes = [];
    });
    testLib.test('loadFromDisk() reads values', function(assert) {
        assert.expect(1);
        commons.fs.write(insnEnv.sitePath + 'site.ini',
            '[ComponentType:Test]\nkey=text');
        website.siteConfig.loadFromDisk();
        assert.deepEqual(website.siteConfig.componentTypes[0],
            {name:'Test', props: {key: 'text'}});
    });
    testLib.test('loadFromDisk() validates values', function(assert) {
        assert.expect(1);
        commons.fs.write(insnEnv.sitePath + 'site.ini',
            '[ComponentType:Test]\nkey=fus');
        try {
            website.siteConfig.loadFromDisk();
        } catch (e) {
            assert.equal(e.message, '\'fus\' is not valid content type.\n');
        }
    });
});