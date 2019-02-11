require('content-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var http = require('http.js');
var website = require('website.js');

testLib.module('content-handlers.js', function() {
    var testCntType = {name:'name', props:''};
    var testCnode = {id:1,name:'foo',json:'',contentTypeName:testCntType.name};
    testLib.test('GET \'/api/content/<id>\' returns a content node', function(assert) {
        assert.expect(3);
        commons.db.insert('insert into contentNodes values (?,?,?,?)', function(stmt) {
            stmt.bindInt(0, testCnode.id);
            stmt.bindString(1, testCnode.name);
            stmt.bindString(2, testCnode.json);
            stmt.bindString(3, testCnode.contentTypeName);
        });
        var req = new http.Request('/api/content/' + testCnode.id, 'GET');
        //
        var response = commons.app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify(testCnode));
        assert.equal(response.headers['Content-Type'], 'application/json');
        //
        if (commons.db.delete('delete from contentNodes where id = ?', function(stmt) {
            stmt.bindInt(0, testCnode.id);
        }) < 1) throw new Error('Failed to clean test data.');
    });
    testLib.test('POST \'/api/content\' inserts data to db', function(assert) {
        assert.expect(5);
        var req = new http.Request('/api/content', 'POST');
        req.data = {name: 'foo', json: JSON.stringify({key: 'val'}),
            contentTypeName: testCntType.name};
        var response = commons.app.getHandler(req.url, req.method)(req);
        //
        var actuallyInserted = {};
        var sql = 'select * from contentNodes order by id desc limit 1';
        commons.db.select(sql, function(row) {
            actuallyInserted = {id: row.getInt(0), name: row.getString(1),
                json: row.getString(2), contentTypeName: row.getString(3)};
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify({insertId:actuallyInserted.id}));
        assert.equal(actuallyInserted.name, req.data.name);
        assert.equal(actuallyInserted.json, req.data.json);
        assert.equal(actuallyInserted.contentTypeName, req.data.contentTypeName);
        //
        if (commons.db.delete('delete from contentNodes where id = ?', function(stmt) {
            stmt.bindInt(0, actuallyInserted.id);
        }) < 1) throw new Error('Failed to clean test data.');
    });
    testLib.test('PUT \'/api/content\' saves data to db', function(assert) {
        assert.expect(5);
        //
        commons.db.insert('insert into contentNodes values (?,?,?,?)', function(stmt) {
            stmt.bindInt(0, testCnode.id);
            stmt.bindString(1, testCnode.name);
            stmt.bindString(2, testCnode.json);
            stmt.bindString(3, testCnode.contentTypeName);
        });
        //
        var req = new http.Request('/api/content', 'PUT');
        req.data = {name: 'foo', json: JSON.stringify({key: 'val'}),
            contentTypeName: testCntType.name};
        var response = commons.app.getHandler(req.url, req.method)(req);
        //
        var newCnode = {};
        var sql = 'select * from contentNodes where id = ' + testCnode.id;
        commons.db.select(sql, function(row) {
            newCnode = {id: row.getInt(0), name: row.getString(1),
                json: row.getString(2), contentTypeName: row.getString(3)};
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '{"numAffectedRows":1}');
        assert.equal(newCnode.name, req.data.name);
        assert.equal(newCnode.json, req.data.json);
        assert.equal(newCnode.contentTypeName, req.data.contentTypeName);
        //
        if (commons.db.delete('delete from contentNodes where id = ?', function(stmt) {
            stmt.bindInt(0, testCnode.id);
        }) < 1) throw new Error('Failed to clean test data.');
    });
    testLib.test('GET \'/api/content-type\' lists content types', function(assert) {
        assert.expect(3);
        website.siteConfig.contentTypes = [{foo: 'bar'}];
        var req = new http.Request('/api/content-type', 'GET');
        //
        var response = commons.app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify(website.siteConfig.contentTypes));
        assert.equal(response.headers['Content-Type'], 'application/json');
    });
    testLib.test('GET \'/api/content-type/<name>\' returns a content type', function(assert) {
        assert.expect(3);
        website.siteConfig.contentTypes = [{name: 'foo'}, {name: 'bar'}];
        var req = new http.Request('/api/content-type/bar', 'GET');
        //
        var response = commons.app.getHandler(req.url, req.method)(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify(website.siteConfig.contentTypes[1]));
        assert.equal(response.headers['Content-Type'], 'application/json');
    });
});