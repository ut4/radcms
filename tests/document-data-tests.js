const {DDC} = require('../src/document-data.js');

QUnit.module('document-data.js', () => {
    QUnit.test('DDC.toSql() generates queries for fetchOne()s', assert => {
        assert.expect(2);
        //
        let ddc1 = new DDC();
        ddc1.fetchOne('Generics').where('name=\'Foo\'');
        assert.equal(ddc1.toSql(),
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` '+
                'from contentNodes where name=\'Foo\''+
            ')'
        );
        //
        let ddc2 = new DDC();
        ddc2.fetchOne('Generics').where('name=\'Foo\'');
        ddc2.fetchOne('Generics').where('name=\'Bar\'');
        ddc2.fetchOne('Articles').where('name=\'Naz\'');
        assert.equal(ddc2.toSql(),
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` '+
                'from contentNodes where name=\'Foo\''+
            ') union all '+
            'select * from (select `id`,`name`,`json`, 2 as `dbcId` '+
                'from contentNodes where name=\'Bar\''+
            ') union all '+
            'select * from (select `id`,`name`,`json`, 3 as `dbcId` '+
                'from contentNodes where name=\'Naz\''+
            ')'
        );
    });
    QUnit.test('DDC.toSql() generates queries for chained fetchOne()s', assert => {
        let ddc = new DDC();
        ddc.fetchOne('Generics').where('name=\'Foo\'')
           .fetchOne('Articles').where('name=\'Bar\'');
        //
        assert.equal(ddc.toSql(),
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` '+
                'from contentNodes where name=\'Foo\''+
            ') union all '+
            'select * from (select `id`,`name`,`json`, 2 as `dbcId` '+
                'from contentNodes where name=\'Bar\''+
            ')'
        );
    });
    QUnit.test('DDC.toSql() generates queries for fetchAll()s', assert => {
        assert.expect(2);
        //
        let ddc1 = new DDC();
        ddc1.fetchAll('Articles');
        assert.equal(ddc1.toSql(),
            'select * from ('+
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where '+
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Articles\')'+
            ')'
        );
        //
        let ddc2 = new DDC();
        ddc2.fetchAll('Articles');
        ddc2.fetchAll('Other');
        assert.equal(ddc2.toSql(),
            'select * from ('+
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where '+
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Articles\')'+
            ') union all '+
            'select * from ('+
                'select `id`,`name`,`json`, 2 as `dbcId` from contentNodes where '+
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Other\')'+
            ')'
        );
    });
    QUnit.test('DDC.toSql() generates queries for chained fetchAll()s', assert => {
        let ddc = new DDC();
        ddc.fetchAll('Generics').where('name like \'foo%\'')
           .fetchAll('Articles').limit('2');
        //
        assert.equal(ddc.toSql(),
            'select * from ('+
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where '+
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Generics\')'+
                ' and name like \'foo%\''+
            ') union all '+
            'select * from ('+
                'select `id`,`name`,`json`, 2 as `dbcId` from contentNodes where '+
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Articles\')'+
                ' limit 2'+
            ')'
        );
    });
    QUnit.test('<dataBathConfig>.toSql() validates itself', assert => {
        assert.expect(4);
        let runInvalid = dbc => {
            try { dbc.toSql(); } catch (e) { return e.message; }
        };
        let ddc = new DDC();
        let dbc1 = ddc.fetchAll();
        assert.equal(runInvalid(dbc1), 'contentTypeName is required');
        let dbc2 = ddc.fetchOne();
        assert.equal(runInvalid(dbc2), 'contentTypeName is required');
        let dbc3 = ddc.fetchOne('foo');
        assert.equal(runInvalid(dbc3), 'fetchOne(...).where() is required.');
        let dbc4 = ddc.fetchOne('-'.repeat(65)).where('1=1');
        assert.equal(runInvalid(dbc4), 'contentTypeName too long (max 64, was 65).');
    });
});