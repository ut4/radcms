import {AddContentView} from './../content-views.js';
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
        httpStub.onCall(0).returns(
            Promise.resolve({responseText: JSON.stringify(testContentTypes)})
        );
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('submits data to backend', assert => {
        httpStub.onCall(1).returns(Promise.resolve({insertId: 1}));
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
            const cnodeNameInput = form.querySelector('input[name="cnodeName"]');
            const titleInput = form.querySelector('input[name="title"]');
            const bodyInput = form.querySelector('textarea[name="body"]');
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
            assert.equal(postCall.args[1].headers['Content-Type'], 'application/json');
            assert.equal(postCall.args[1].data, JSON.stringify({
                name: cnodeNameInput.value,
                json: JSON.stringify({title: titleInput.value, body: bodyInput.value}),
                contentTypeName: 'Article'
            }));
            postCall.returnValue.then(() => {
                assert.ok(redirectSpy.calledAfter(httpStub), 'Should redirect');
                redirectSpy.restore();
                done();
            });
        });
    });
    QUnit.test('submits extra fields', assert => {
        httpStub.onCall(1).returns(Promise.resolve(null));
        const tree = itu.renderIntoDocument($el(AddContentView, {
            initialContentTypeName: 'Generic'
        }, null));
        //
        const done = assert.async();
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('input[type="submit"]');
            const cnodeNameInput = form.querySelector('input[name="cnodeName"]');
            const contentInput = form.querySelector('textarea[name="content"]');
            const extraFieldForm = form.querySelector('.extra-field-form');
            const addExtraFieldBtn = extraFieldForm.children[0];
            // Add an extra field
            addExtraFieldBtn.click();
            const extraFieldNameInput = extraFieldForm.querySelector('input[name="openFieldName"]');
            const extraFieldDataTypeInput = extraFieldForm.querySelector('select[name="openFieldDataType"]');
            utils.setInputValue('newField', extraFieldNameInput, 'input');
            utils.setDropdownIndex(1, extraFieldDataTypeInput);
            extraFieldForm.querySelector('button:first-of-type').click();
            const extraFieldValueInput = form.querySelector('textarea[name="newField"]');
            // Fill out the fields (own and the extra)
            utils.setInputValue('/new-article', cnodeNameInput);
            utils.setInputValue('foo', contentInput);
            utils.setInputValue('bar', extraFieldValueInput);
            //
            submitButton.click();
            //
            const postCall = httpStub.getCall(1);
            assert.equal(postCall.args[1].data, JSON.stringify({
                name: cnodeNameInput.value,
                json: JSON.stringify({
                    content: contentInput.value,
                    'newField__separator__richtext': extraFieldValueInput.value
                }),
                contentTypeName: 'Generic'
            }));
            postCall.returnValue.then(() => {
                done();
            });
        }).catch(e=>{console.log(e);
        });
    });
    QUnit.test('shows message if backend fails', assert => {
        httpStub.onCall(1).returns(Promise.reject());
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(AddContentView, null, null));
        //
        const done = assert.async();
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('input[type="submit"]');
            const cnodeNameInput = form.querySelector('input[name="cnodeName"]');
            const contentInput = form.querySelector('textarea[name="content"]');
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
