require('../src/content-handlers.js').init();
const {Stub, testEnv} = require('./env.js');
const {app} = require('../src/app.js');
const {webApp} = require('../src/web.js');

QUnit.module('content-handlers.js', function(hooks) {
    const testCntType = {id: 5, name: 'name', fields: null};
    const testCntType2 = {id: 2, name: 'another', fields: null};
    const testCnode = {id: 1, name: 'foo', json: '', contentTypeId: testCntType.id};
    let website;
    hooks.before(() => {
        testEnv.setupTestWebsite();
        website = app.currentWebsite;
        if (website.db.prepare('insert into contentTypes values (?,?,?),(?,?,?)')
                      .run(testCntType.id, testCntType.name, testCntType.fields,
                           testCntType2.id, testCntType2.name, testCntType2.fields)
                      .changes < 2)
            throw new Error('Failed to insert test data.');
    });
    hooks.after(() => {
        if (website.db.prepare('delete from contentTypes where `id` in (?,?)')
                      .run(testCntType.id, testCntType2.id)
                      .changes < 2)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('GET \'/api/content/<id>\' returns a content node', assert => {
        assert.expect(2);
        if (website.db.prepare('insert into contentNodes values (?,?,?,?)')
                      .run(testCnode.id, testCnode.name, testCnode.json,
                           testCnode.contentTypeId).changes < 1)
            throw new Error('Failed to insert test data.');
        const req = webApp.makeRequest('/api/content/' + testCnode.id, 'GET');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.path, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.deepEqual(body, testCnode);
        //
        if (website.db.prepare('delete from contentNodes where id = ?')
                      .run(testCnode.id).changes < 1)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('POST \'/api/content\' inserts data to db', assert => {
        assert.expect(5);
        const req = webApp.makeRequest('/api/content', 'POST',
            {name: 'foo', json: JSON.stringify({key: 'val'}),
             contentTypeId: testCntType.id});
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.path, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        const actuallyInserted = website.db
            .prepare('select * from contentNodes order by id desc limit 1')
            .get();
        assert.equal(statusCode, 200);
        assert.deepEqual(body, {insertId:actuallyInserted.id});
        assert.equal(actuallyInserted.name, req.data.name);
        assert.equal(actuallyInserted.json, req.data.json);
        assert.equal(actuallyInserted.contentTypeId, req.data.contentTypeId);
        //
        if (website.db.prepare('delete from contentNodes where id = ?')
                      .run(actuallyInserted.id).changes < 1)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('PUT \'/api/content\' saves data to db', assert => {
        assert.expect(5);
        //
        if (website.db.prepare('insert into contentNodes values (?,?,?,?)')
                      .run(testCnode.id, testCnode.name, testCnode.json,
                           testCnode.contentTypeId).changes < 1)
            throw new Error('Failed to insert test data.');
        //
        const req = webApp.makeRequest('/api/content', 'PUT',
            {name: 'foo', json: JSON.stringify({key: 'val'}),
             contentTypeId: testCntType.id});
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.path, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        const newCnode = website.db
            .prepare('select * from contentNodes where id = ?')
            .get(testCnode.id);
        assert.equal(statusCode, 200);
        assert.deepEqual(body, {"numAffectedRows":1});
        assert.equal(newCnode.name, req.data.name);
        assert.equal(newCnode.json, req.data.json);
        assert.equal(newCnode.contentTypeId, req.data.contentTypeId);
        //
        if (website.db.prepare('delete from contentNodes where id = ?')
                      .run(testCnode.id).changes < 1)
            throw new Error('Failed to clean test data.');
    });
    QUnit.test('GET \'/api/content-types\' lists content types', assert => {
        assert.expect(2);
        //
        const req = webApp.makeRequest('/api/content-types', 'GET');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.path, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.deepEqual(body, [testCntType2, testCntType]);
        //
    });
    QUnit.test('GET \'/api/content-types/<id>\' returns a content type', assert => {
        assert.expect(2);
        const req = webApp.makeRequest('/api/content-types/' + testCntType2.id, 'GET');
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.path, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        assert.equal(statusCode, 200);
        assert.deepEqual(body, testCntType2);
    });
    QUnit.test('PUT \'/api/content-types\' saves data to db', assert => {
        assert.expect(4);
        //
        const testType = {id: 45, name: 'atest', fields: '["dum"]'};
        if (website.db.prepare('insert into contentTypes values (?,?,?)')
                      .run(testType.id, testType.name, testType.fields)
                      .changes < 1)
            throw new Error('Failed to insert test data.');
        //
        const req = webApp.makeRequest('/api/content-types', 'PUT',
            {id: testType.id, name: 'updated name', fields: '["updated dum"]'});
        const res = webApp.makeResponse();
        const sendRespSpy = new Stub(res, 'json');
        //
        webApp.getHandler(req.path, req.method)(req, res);
        const [statusCode, body] = [...sendRespSpy.callInfo[0]];
        const actuallyUpdated = website.db
            .prepare('select * from contentTypes where id = ?')
            .get(testType.id);
        assert.equal(statusCode, 200);
        assert.deepEqual(body, {"numAffectedRows":1});
        assert.equal(actuallyUpdated.name, req.data.name);
        assert.equal(actuallyUpdated.fields, req.data.fields);
        //
        if (website.db.prepare('delete from contentTypes where id = ?')
                      .run(testType.id).changes < 1)
            throw new Error('Failed to clean test data.');
    });
});
