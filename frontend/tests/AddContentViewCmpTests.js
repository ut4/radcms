import {AddContentView} from './../app.js';
import services from './../common-services.js';
import utils from './my-test-utils.js';
const itu = Inferno.TestUtils;
const testContentTypes = [
    {name: 'Generic', fields: {content: 'richtext'}},
    {name: 'Article', fields: {title: 'text', body: 'richtext'}}
];

QUnit.module('AddContentViewComponent', hooks => {
    let httpStub;
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('submits data to backend', assert => {
        httpStub
            .onCall(0)
                .returns(Promise.resolve({responseText: JSON.stringify(testContentTypes)}))
            .onCall(1)
                .returns(Promise.resolve({insertId: 1}));
        const redirectSpy = sinon.spy(window, 'myRedirect');
        const tree = itu.renderIntoDocument($el(AddContentView, {
            initialContentTypeName: 'Article'
        }, null));
        //
        const done = assert.async();
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('input[type="submit"]');
            const cnodeNameInput = form.querySelector('input[name="name"]');
            const titleInput = form.querySelector('input[name="val-title"]');
            const bodyInput = form.querySelector('textarea[name="val-body"]');
            // Fill out the form
            utils.setInputValue('/new-article', cnodeNameInput);
            utils.setInputValue('New article', titleInput);
            utils.setInputValue('Hello from my new article', bodyInput);
            // Submit it
            submitButton.click();
            // Did it send anything?
            assert.ok(httpStub.calledTwice, 'Should send data to backend');
            const postCall = httpStub.getCall(1);
            assert.equal(postCall.args[0], '/api/content');
            assert.equal(postCall.args[1].method, 'POST');
            assert.equal(postCall.args[1].data,
                'name=' + encodeURIComponent(cnodeNameInput.value) +
                '&json=' + encodeURIComponent(
                    JSON.stringify({title: titleInput.value, body: bodyInput.value})
                ) +
                '&contentTypeName=Article'
            );
            postCall.returnValue.then(() => {
                assert.ok(redirectSpy.calledAfter(httpStub), 'Should redirect');
                redirectSpy.restore();
                done();
            });
        });
    });
    QUnit.test('shows message if backend fails', assert => {
        httpStub
            .onCall(0)
                .returns(Promise.resolve({responseText: JSON.stringify(testContentTypes)}))
            .onCall(1)
                .returns(Promise.reject());
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(AddContentView, null, null));
        //
        const done = assert.async();
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('input[type="submit"]');
            const cnodeNameInput = form.querySelector('input[name="name"]');
            const contentInput = form.querySelector('textarea[name="val-content"]');
            // Fill out the form
            utils.setInputValue('/new-article', cnodeNameInput);
            utils.setInputValue('Generic content content', contentInput);
            // Submit it
            submitButton.click();
            //
            assert.ok(httpStub.calledTwice, 'Sanity check httpStub.called');
            httpStub.getCall(1).returnValue.then(null, () => {
                const call = toastSpy.getCall(0);
                assert.ok(call !== null, 'Should show error');
                if (call) assert.equal(call.args[1], 'error');
                toastSpy.restore();
                done();
            });
        });
    });
});
