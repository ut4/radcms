import {AddComponentView} from './../app.js';
import services from './../common-services.js';
import utils from './my-test-utils.js';
const itu = Inferno.TestUtils;
const testComponentTypes = [{id: 1, name: 'Generic', props: [
    {id: 1, name: 'content', contentType: 'richtext'}
]},
{id: 2, name: 'Article', props: [
    {id: 2, name: 'title', contentType: 'text'},
    {id: 3, name: 'body', contentType: 'richtext'}
]}];

QUnit.module('AddComponentViewComponent', hooks => {
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
                .returns(Promise.resolve({responseText: JSON.stringify(testComponentTypes)}))
            .onCall(1)
                .returns(Promise.resolve(1));
        const redirectSpy = sinon.spy(window, 'myRedirect');
        const tree = itu.renderIntoDocument($el(AddComponentView, {
            initialComponentTypeName: 'Article'
        }, null));
        //
        const done = assert.async();
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('input[type="submit"]');
            const cmpNameInput = form.querySelector('input[name="name"]');
            const titleInput = form.querySelector('input[name="val-title"]');
            const bodyInput = form.querySelector('textarea[name="val-body"]');
            // Fill out the form
            utils.setInputValue("/new-article", cmpNameInput);
            utils.setInputValue("New article", titleInput);
            utils.setInputValue("Hello from my new article", bodyInput);
            // Submit it
            submitButton.click();
            // Did it send anything?
            assert.ok(httpStub.calledTwice, 'Should send data to backend');
            const postCall = httpStub.getCall(1);
            assert.equal(postCall.args[0], '/api/component');
            assert.equal(postCall.args[1].method, 'POST');
            assert.equal(postCall.args[1].data,
                'name=' + encodeURIComponent(cmpNameInput.value) +
                '&json=' + encodeURIComponent(
                    JSON.stringify({title: titleInput.value, body: bodyInput.value})
                ) +
                '&componentTypeId=2'
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
                .returns(Promise.resolve({responseText: JSON.stringify(testComponentTypes)}))
            .onCall(1)
                .returns(Promise.reject());
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(AddComponentView, null, null));
        //
        const done = assert.async();
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('input[type="submit"]');
            const cmpNameInput = form.querySelector('input[name="name"]');
            const contentInput = form.querySelector('textarea[name="val-content"]');
            // Fill out the form
            utils.setInputValue("/new-article", cmpNameInput);
            utils.setInputValue("Generic component content", contentInput);
            // Submit it
            submitButton.click();
            // Did window.toast(<message>, 'error') got called?
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
