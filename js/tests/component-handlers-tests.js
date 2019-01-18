require('component-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var http = require('http.js');
var website = require('website.js');

testLib.module('component-handlers.js', function() {
    var testCmpType = {name:'name', props:''};
    testLib.test('GET \'/api/component-type\' lists component types', function(assert) {
        assert.expect(3);
        var req = new http.Request('/api/component-type', 'GET');
        var handleGetCmpTypesRequestFn = commons.app.getHandler(req.url, req.method);
        website.siteConfig.componentTypes = {foo: 'bar'};
        //
        var response = handleGetCmpTypesRequestFn(req);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify(website.siteConfig.componentTypes));
        assert.equal(response.headers['Content-Type'], 'application/json');
    });
    testLib.test('POST \'/api/component\' creates a new component', function(assert) {
        assert.expect(5);
        var req = new http.Request('/api/component', 'POST');
        var handleCreateComponentRequestFn = commons.app.getHandler(req.url, req.method);
        //
        req.data = {name: 'foo', json: JSON.stringify({key: 'val'}), componentTypeName: testCmpType.name};
        var response = handleCreateComponentRequestFn(req);
        //
        var actuallyInserted = {};
        commons.db.select('select * from components order by id desc limit 1', function(row) {
            actuallyInserted = {id: row.getInt(0), name: row.getString(1),
                json: row.getString(2), componentTypeName: row.getString(3)};
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, JSON.stringify({insertId:actuallyInserted.id}));
        assert.equal(actuallyInserted.name, req.data.name);
        assert.equal(actuallyInserted.json, req.data.json);
        assert.equal(actuallyInserted.componentTypeName, req.data.componentTypeName);
        //
        if (commons.db.delete('delete from components where id = ?', function(stmt) {
            stmt.bindInt(0, actuallyInserted.id);
        }) < 1) throw new Error('Failed to clean test data.');
    });
});