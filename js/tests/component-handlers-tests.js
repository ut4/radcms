require('component-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var http = require('http.js');

testLib.module('component-handlers.js', function(hooks) {
    var testCmpType = {id: 1, name:'name', props:[{key:'a',contentType:'text',ctid:1}]};
    var testCmpType2 = {id: 2, name:'Book', props:[{key:'b',contentType:'text',ctid:2},
                                                   {key:'c',contentType:'richtext',ctid:2}]};
    var testCmpType3 = {id: 3, name:'Movie', props:[{key:'d',contentType:'text',ctid:3}]};
    hooks.before(function() {
        var sql = 'insert into componentTypes values (?,?),(?,?),(?,?)';
        var sql2 = 'insert into componentTypeProps values (?,?,?,?),(?,?,?,?),(?,?,?,?),(?,?,?,?)';
        if (commons.db.insert(sql, function(stmt) {
                [testCmpType,testCmpType2,testCmpType3].forEach(function(ctype, i) {
                    stmt.bindInt(i*2, ctype.id);
                    stmt.bindString(i*2+1, ctype.name);
                });
            }) < 1 ||
            commons.db.insert(sql2, function(stmt) {
                testCmpType.props.concat(testCmpType2.props).concat(testCmpType3.props)
                .forEach(function(p, i) {
                    stmt.bindInt(i*4, i+1);
                    stmt.bindString(i*4+1, p.key);
                    stmt.bindString(i*4+2, p.contentType);
                    stmt.bindInt(i*4+3, p.ctid);
                });
            }) < 1
        ) throw new Error('Failed to insert test data.');
    });
    hooks.after(function() {
        if (commons.db.delete('delete from componentTypeProps', function() {}) < 1 ||
            commons.db.delete('delete from componentTypes', function() {}) < 1
        ) throw new Error('Failed to clean test data.');
    });
    testLib.test('GET \'/api/component-type\' lists component types', function(assert) {
        assert.expect(3);
        var req = new http.Request('/api/component-type', 'GET');
        var handleGetCmpTypesRequestFn = commons.app.getHandler(req.url, req.method);
        //
        var response = handleGetCmpTypesRequestFn(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify([
            {id: testCmpType.id, name: testCmpType.name, props: [
                {id: 1, name: testCmpType.props[0].key,
                 contentType: testCmpType.props[0].contentType,
                 componentTypeId: testCmpType.id}
            ]},
            {id: testCmpType2.id, name: testCmpType2.name, props: [
                {id: 2, name: testCmpType2.props[0].key,
                 contentType: testCmpType2.props[0].contentType,
                 componentTypeId: testCmpType2.id},
                {id: 3, name: testCmpType2.props[1].key,
                 contentType: testCmpType2.props[1].contentType,
                 componentTypeId: testCmpType2.id}
            ]},
            {id: testCmpType3.id, name: testCmpType3.name, props: [
                {id: 4, name: testCmpType3.props[0].key,
                 contentType: testCmpType3.props[0].contentType,
                 componentTypeId: testCmpType3.id}
            ]}
        ]));
        assert.equal(response.headers['Content-Type'], 'application/json');
    });
    testLib.test('POST \'/api/component\' creates a new component', function(assert) {
        assert.expect(5);
        var req = new http.Request('/api/component', 'POST');
        var handleCreateComponentRequestFn = commons.app.getHandler(req.url, req.method);
        //
        req.data = {name: 'foo', json: JSON.stringify({key: 'val'}), componentTypeId: testCmpType.id};
        var response = handleCreateComponentRequestFn(req);
        //
        var actuallyInserted = {};
        commons.db.select('select * from components order by id desc limit 1', function(row) {
            actuallyInserted = {id: row.getInt(0), name: row.getString(1),
                json: row.getString(2), componentTypeId: row.getInt(3)};
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, actuallyInserted.id);
        assert.equal(actuallyInserted.name, req.data.name);
        assert.equal(actuallyInserted.json, req.data.json);
        assert.equal(actuallyInserted.componentTypeId, req.data.componentTypeId);
        //
        if (commons.db.delete('delete from components where id = ?', function(stmt) {
            stmt.bindInt(0, actuallyInserted.id);
        }) < 1) throw new Error('Failed to clean test data.');
    });
});