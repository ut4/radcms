import {SiteGraphEditView} from './../site-graph-views.js';
import services from './../common-services.js';
const itu = Inferno.TestUtils;

QUnit.module('SiteGraphEditComponent', hooks => {
    let httpStub;
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('ticks/unticks deletable pages, sends data to backend', assert => {
        assert.expect(12);
        const testSiteGraph = JSON.stringify({pages:[
            {url:'/home'}, {url:'/news'}, {url:'/contact'}
        ]});
        httpStub
            .onCall(0).returns(Promise.resolve({responseText: testSiteGraph}))
            .onCall(1).returns(Promise.resolve({responseText: ''}));
        const toastSpy = sinon.spy(window, 'toast');
        //
        const tree = itu.renderIntoDocument($el(SiteGraphEditView, null, null));
        const done = assert.async();
        // Wait for constructor's GET /api/website/site-graph
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const submitButton = form.querySelector('input[type="submit"]');
            const pageTableRows = form.querySelectorAll('tbody tr');
            const newsPageDeleteButton = pageTableRows[1].querySelector('button');
            const contentPageDeleteButton = pageTableRows[2].querySelector('button');
            assert.ok(submitButton.disabled, 'The submit button should be disabled');
            // Tick and then untick the "news" page
            newsPageDeleteButton.click();
            assert.equal(pageTableRows[1].className, 'line-through');
            assert.ok(!submitButton.disabled, 'Should enable the submit button');
            newsPageDeleteButton.click();
            assert.ok(submitButton.disabled, 'Should disable the submit button again');
            // Tick the "content" page
            assert.equal(pageTableRows[1].className, '');
            contentPageDeleteButton.click();
            assert.equal(pageTableRows[2].className, 'line-through');
            // Send the form
            submitButton.click();
            const putCall = httpStub.getCall(1);
            assert.equal(putCall.args[0], '/api/website/site-graph');
            assert.equal(putCall.args[1].method, 'PUT');
            assert.equal(putCall.args[1].headers['Content-Type'], 'application/json');
            assert.equal(putCall.args[1].data, '{"deleted":["/contact"]}');
            putCall.returnValue.then(() => {
                assert.ok(toastSpy.calledAfter(httpStub), 'Should show success message');
                assert.equal(toastSpy.getCall(0).args[0], 'Updated the site graph.');
                toastSpy.restore();
                done();
            });
        });
    });
});