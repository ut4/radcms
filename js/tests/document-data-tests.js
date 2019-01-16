var documentData = require('document-data.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('document-data.js', function() {
    testLib.test('<dataBathConfig>.toSql() validates itself', function(assert) {
        assert.expect(4);
        var runInvalid = function(dbc) {
            try { dbc.toSql(); } catch (e) { return e.message; }
        };
        var ddc = new documentData.DDC();
        var dbc1 = ddc.fetchAll();
        assert.equal(runInvalid(dbc1), 'Component type name is required');
        var dbc2 = ddc.fetchOne();
        assert.equal(runInvalid(dbc2), 'Component type name is required');
        var dbc3 = ddc.fetchOne('foo');
        assert.equal(runInvalid(dbc3), 'fetchOne(...).where() is required.');
        var dbc4 = ddc.fetchOne('-'.repeat(65)).where('1=1');
        assert.equal(runInvalid(dbc4), 'Component type name too long (max 64, was 65).');
    });
});