require('content-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var http = require('http.js');
var website = require('website.js');

testLib.module('content-handlers.js', function() {
    var testCntType = {name:'name', props:''};
    testLib.test('GET \'/api/content-type\' lists content types', function(assert) {
        assert.expect(3);
        var req = new http.Request('/api/content-type', 'GET');
        var handleGetCntTypesRequestFn = commons.app.getHandler(req.url, req.method);
        website.siteConfig.contentTypes = {foo: 'bar'};
        //
        var response = handleGetCntTypesRequestFn(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify(website.siteConfig.contentTypes));
        assert.equal(response.headers['Content-Type'], 'application/json');
    });
    testLib.test('POST \'/api/content\' creates a new content node', function(assert) {
        assert.expect(5);
        var req = new http.Request('/api/content', 'POST');
        var handleCreateContentRequestFn = commons.app.getHandler(req.url, req.method);
        //
        req.data = {name: 'foo', json: JSON.stringify({key: 'val'}),
            contentTypeName: testCntType.name};
        var response = handleCreateContentRequestFn(req);
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
});