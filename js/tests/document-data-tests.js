var documentData = require('document-data.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('document-data.js', function() {
    testLib.test('DDC.toSql() generates queries for fetchOne()s', function(assert) {
        assert.expect(2);
        //
        var ddc1 = new documentData.DDC();
        ddc1.fetchOne('Generic').where('name=\'Foo\'');
        assert.equal(ddc1.toSql(), 'select `id`,`name`,`json`,`dbcId` from ('+
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` '+
                'from contentNodes where name=\'Foo\''+
            ')'+
        ')');
        //
        var ddc2 = new documentData.DDC();
        ddc2.fetchOne('Generic').where('name=\'Foo\'');
        ddc2.fetchOne('Generic').where('name=\'Bar\'');
        ddc2.fetchOne('Artible').where('name=\'Naz\'');
        assert.equal(ddc2.toSql(), 'select `id`,`name`,`json`,`dbcId` from ('+
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` '+
                'from contentNodes where name=\'Foo\''+
            ') union all '+
            'select * from (select `id`,`name`,`json`, 2 as `dbcId` '+
                'from contentNodes where name=\'Bar\''+
            ') union all '+
            'select * from (select `id`,`name`,`json`, 3 as `dbcId` '+
                'from contentNodes where name=\'Naz\''+
            ')'+
        ')');
    });
    testLib.test('DDC.toSql() generates queries for fetchAll()s', function(assert) {
        assert.expect(2);
        //
        var ddc1 = new documentData.DDC();
        ddc1.fetchAll('Article');
        assert.equal(ddc1.toSql(), 'select `id`,`name`,`json`,`dbcId` from ('+
            'select * from ('+
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where '+
                '`contentTypeName` = \'Article\''+
            ')'+
        ')');
        //
        var ddc2 = new documentData.DDC();
        ddc2.fetchAll('Article');
        ddc2.fetchAll('Other');
        assert.equal(ddc2.toSql(), 'select `id`,`name`,`json`,`dbcId` from ('+
            'select * from ('+
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where '+
                '`contentTypeName` = \'Article\''+
            ') union all '+
            'select * from ('+
                'select `id`,`name`,`json`, 2 as `dbcId` from contentNodes where '+
                '`contentTypeName` = \'Other\''+
            ')'+
        ')');
    });
    testLib.test('<dataBathConfig>.toSql() validates itself', function(assert) {
        assert.expect(4);
        var runInvalid = function(dbc) {
            try { dbc.toSql(); } catch (e) { return e.message; }
        };
        var ddc = new documentData.DDC();
        var dbc1 = ddc.fetchAll();
        assert.equal(runInvalid(dbc1), 'contentTypeName is required');
        var dbc2 = ddc.fetchOne();
        assert.equal(runInvalid(dbc2), 'contentTypeName is required');
        var dbc3 = ddc.fetchOne('foo');
        assert.equal(runInvalid(dbc3), 'fetchOne(...).where() is required.');
        var dbc4 = ddc.fetchOne('-'.repeat(65)).where('1=1');
        assert.equal(runInvalid(dbc4), 'contentTypeName too long (max 64, was 65).');
    });
});