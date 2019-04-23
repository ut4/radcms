import {WebsiteListView, WebsiteCreateView} from '../src/app-website-views.js';
import services from '../../src/common-services.js';
import utils from '../../tests/my-test-utils.js';
const itu = Inferno.TestUtils;

QUnit.module('WebsiteListViewComponent', hooks => {
    let httpStub;
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('lists the websites', assert => {
        assert.expect(6);
        const testSites = [
            {id:1,dirPath:'c:/projects/a',name:'site.com',createdAt:new Date(2000,2-1,23).getTime()/1000},
            {id:2,dirPath:'c:/projects/b',name:null,createdAt:new Date(2001,2-1,25).getTime()/1000},
        ];
        httpStub.returns(Promise.resolve({responseText: JSON.stringify(testSites)}));
        //
        const tree = itu.renderIntoDocument($el(WebsiteListView, null, null));
        const done = assert.async();
        //
        httpStub.getCall(0).returnValue.then(() => {
            const listItems = itu.findRenderedDOMElementWithClass(tree, 'website-list').children;
            //
            const title1 = listItems[0].querySelector('h3').textContent;
            const info1 = listItems[0].querySelectorAll('li');
            const dirPath1 = info1[0].textContent;
            const createdAt1 = info1[1].textContent;
            assert.equal(title1, testSites[0].name);
            assert.equal(dirPath1, 'Location' + testSites[0].dirPath);
            assert.equal(createdAt1, 'Created at' +
                new Date(testSites[0].createdAt * 1000).toLocaleString());
            //
            const title2 = listItems[1].querySelector('h3').textContent;
            const info2 = listItems[1].querySelectorAll('li');
            const dirPath2 = info2[0].textContent;
            const createdAt2 = info2[1].textContent;
            assert.equal(title2, 'untitled');
            assert.equal(dirPath2, 'Location' + testSites[1].dirPath);
            assert.equal(createdAt2, 'Created at' +
                new Date(testSites[1].createdAt * 1000).toLocaleString());
            done();
        });
    });
});

QUnit.module('WebsiteCreateViewComponent', hooks => {
    let httpStub;
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('sends data to backend', assert => {
        const testSampleDataOptions = [{name:'blog'},{name:'portfolio'}];
        httpStub
            .onCall(0).returns(Promise.resolve({responseText:JSON.stringify(testSampleDataOptions)}))
            .onCall(1).returns(Promise.resolve({responseText:'{"status":"ok"}'}));
        const redirectStub = sinon.stub(preactRouter, 'route');
        //
        const tree = itu.renderIntoDocument($el(WebsiteCreateView, null, null));
        const done = assert.async();
        httpStub.firstCall.returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const dirPathInput = form.querySelector('input[name="dirPath"]');
            const sampleDataDropdown = form.querySelector('select[name="sampleDataName"]');
            const nameInput = form.querySelector('input[name="name"]');
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const submitButton = formButtons.querySelector('button[type="submit"]');
            // Fill out the form
            utils.setInputValue('c:/path/to/dir', dirPathInput);
            utils.setDropdownIndex(1, sampleDataDropdown);
            utils.setInputValue('berties-backside.biz', nameInput);
            // Submit it
            submitButton.click();
            const postCall = httpStub.getCall(1);
            assert.ok(!!postCall, 'Should send data to backend');
            assert.equal(postCall.args[0], '/api/websites');
            assert.equal(postCall.args[1].method, 'POST');
            assert.equal(postCall.args[1].headers['Content-Type'], 'application/json');
            assert.equal(postCall.args[1].data, JSON.stringify({
                name: nameInput.value,
                dirPath: dirPathInput.value,
                sampleDataName: testSampleDataOptions[1].name
            }));
            postCall.returnValue.then(() => {
                assert.ok(redirectStub.calledAfter(httpStub), 'Should redirect to "/"');
                redirectStub.restore();
                done();
            });
        });
    });
});
