require('website-handlers.js');
var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;
var website = require('website.js');
var http = require('http.js');

testLib.module('website-handlers.js', function() {
    testLib.test('GET \'/<url>\' serves a page', function(assert) {
        assert.expect(6);
        var websiteHandlersMatcherFn = commons.app._routeMatchers[0];
        var handlePageRequestFn = websiteHandlersMatcherFn('/', 'GET');
        //
        var response = handlePageRequestFn(new http.Request('/', 'GET'));
        assert.equal(response.statusCode, 200);
        assert.ok(response.body.indexOf('<h2>Art1') > -1, 'should contain "<h2>Art1"');
        assert.ok(response.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
        //
        var response2 = handlePageRequestFn(new http.Request('/404', 'GET'));
        assert.equal(response2.statusCode, 404);
        assert.ok(response2.body.indexOf('Not found') > -1, 'should contain "Not found"');
        assert.ok(response2.body.indexOf('<iframe') > -1, 'should contain "<iframe"');
    });
    testLib.test('POST \'/api/website/generate\' generates the site', function(assert) {
        assert.expect(4);
        var websiteHandlersMatcherFn = commons.app._routeMatchers[0];
        var req = new http.Request('/api/website/generate', 'POST');
        var handleGenerateReqFn = websiteHandlersMatcherFn(req.url, req.method);
        //
        var response = handleGenerateReqFn(req);
        assert.equal(response.statusCode, 200);
        var body = JSON.parse(response.body);
        assert.equal(body.wrotePagesNum, 4);
        assert.equal(body.totalPages, website.siteGraph.pageCount);
        assert.equal(body.issues.length, 0);
    });
});