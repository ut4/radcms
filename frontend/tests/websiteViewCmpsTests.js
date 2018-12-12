import {WebsiteGenerateView} from './../website-views.js';
import services from './../common-services.js';
const itu = Inferno.TestUtils;

QUnit.module('WebsiteGenerateViewComponent', hooks => {
    let httpStub;
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('sends request to backend', assert => {
        const responseText = JSON.stringify({
            targetRoot: '/some/path/',
            targetDir: 'my/dir',
            wrotePagesNum: 5,
            tookSecs: 0.002672617,
            totalPages: 6,
            issues: []
        });
        httpStub.onCall(0).returns(Promise.resolve({responseText}));
        const toastSpy = sinon.spy(window, 'toast');
        const redirectSpy = sinon.spy(window, 'myRedirect');
        const tree = itu.renderIntoDocument($el(WebsiteGenerateView, null, null));
        //
        const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
        formButtons.querySelector('input[type="submit"]').click();
        //
        const postCall = httpStub.getCall(0);
        assert.ok(postCall !== null, 'Should send request to backend');
        assert.equal(postCall.args[0], '/api/website/generate');
        assert.equal(postCall.args[1].method, 'POST');
        const done = assert.async();
        postCall.returnValue.then(() => {
            assert.ok(toastSpy.calledAfter(httpStub), 'Should show success message');
            const r = JSON.parse(responseText);
            assert.equal(toastSpy.getCall(0).args[0], [
                'Wrote ', r.wrotePagesNum, '/', r.totalPages, ' pages to "',
                r.targetRoot, r.targetDir, '" in ', r.tookSecs.toFixed(6), ' secs.'
            ].join(''));
            assert.ok(redirectSpy.calledAfter(toastSpy), 'Should redirect');
            toastSpy.restore();
            redirectSpy.restore();
            done();
        });
    });
    QUnit.test('displays issues and warnings', assert => {
        const responseText = JSON.stringify({
            targetRoot: '/some/path/',
            targetDir: '/my/dir',
            wrotePagesNum: 5,
            tookSecs: 0.002672617,
            totalPages: 6,
            issues: ['/some-url>Some error.']
        });
        httpStub.onCall(0).returns(Promise.resolve({responseText}));
        const tree = itu.renderIntoDocument($el(WebsiteGenerateView, null, null));
        //
        const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
        formButtons.querySelector('input[type="submit"]').click();
        //
        const postCall = httpStub.getCall(0);
        assert.ok(postCall !== null, 'Should send request to backend');
        assert.equal(postCall.args[0], '/api/website/generate');
        assert.equal(postCall.args[1].method, 'POST');
        const done = assert.async();
        postCall.returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const mainContent = form.children[1].children[0];
            const firstError = form.children[1].children[1];
            const g = JSON.parse(responseText);
            assert.equal(mainContent.textContent, ['Wrote ', g.wrotePagesNum, '/',
                g.totalPages, ' pages to "', g.targetRoot, g.targetDir,
                '", but had the following issues:'].join(''));
            assert.equal(firstError.textContent, '/some-url: Some error.');
            done();
        });
    });
});
