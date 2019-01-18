import {WebsiteGenerateView, WebsiteUploadView, UploadStatus} from './../website-views.js';
import services from './../common-services.js';
import utils from './my-test-utils.js';
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
            outPath: '/my/site/path/out',
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
                r.outPath, '" in ', r.tookSecs.toFixed(6), ' secs.'
            ].join(''));
            assert.ok(redirectSpy.calledAfter(toastSpy), 'Should redirect');
            toastSpy.restore();
            redirectSpy.restore();
            done();
        });
    });
    QUnit.test('displays issues and warnings', assert => {
        const responseText = JSON.stringify({
            outPath: '/my/site/path/out',
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
                g.totalPages, ' pages to "', g.outPath,
                '", but had the following issues:'].join(''));
            assert.equal(firstError.textContent, '/some-url: Some error.');
            done();
        });
    });
});

QUnit.module('WebsiteUploadViewComponent', hooks => {
    let httpStub;
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('sends request to backend and updates upload statuses', assert => {
        const testPages = [
            {id:1,url:'/',uploadStatus:UploadStatus.NOT_UPLOADED},
            {id:2,url:'/foo',uploadStatus:UploadStatus.NOT_UPLOADED},
            {id:3,url:'/bar',uploadStatus:UploadStatus.NOT_UPLOADED}
        ];
        httpStub
            .onCall(0)
                .returns(Promise.resolve({responseText: JSON.stringify(testPages)}))
            .onCall(1)
                .returns(Promise.resolve({responseText: ''}));
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(WebsiteUploadView, null, null));
        //
        const done = assert.async();
        // Wait for GET /api/website/pages
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const remoteUrlInput = form.querySelector('input[name="ftpRemoteUrl"]');
            const usernameInput = form.querySelector('input[name="ftpUsername"]');
            const passwordInput = form.querySelector('input[name="ftpPassword"]');
            const pageTableRows = form.querySelectorAll('tbody tr');
            const submitButton = form.querySelector('input[type="submit"]');
            //
            assert.equal(remoteUrlInput.value, 'ftp://ftp.mysite.net/public_html/');
            assert.equal(usernameInput.value, 'ftp@mysite.net');
            assert.equal(pageTableRows.length, testPages.length);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'No');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'No');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'No');
            //
            utils.setInputValue('ftp://ftp.foo.net/htdocs/', remoteUrlInput);
            utils.setInputValue('ftp@foo.net', usernameInput);
            utils.setInputValue('asd', passwordInput);
            submitButton.click();
            //
            assert.ok(submitButton.disabled, "Should disable the submit button");
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Uploading...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Uploading...');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Uploading...');
            const postCall = httpStub.getCall(1);
            assert.ok(postCall !== null, 'Should send request to backend');
            assert.equal(postCall.args[0], '/api/website/upload');
            assert.equal(postCall.args[1].method, 'POST');
            assert.equal(postCall.args[1].data,
                'remoteUrl=' + encodeURIComponent(remoteUrlInput.value) +
                '&username=' + encodeURIComponent(usernameInput.value) +
                '&password=' + encodeURIComponent(passwordInput.value)
            );
            // Simulate xhr.onprogress calls
            const progressClb = postCall.args[1].progress;
            const successCode = '0';
            const chunkify = str => `${parseFloat(str.length).toString(16)}\r\n${str}\r\n`;
            // first call <l1>\r\n<body1>\r\n
            const fakeResponse1 = {responseText: chunkify(testPages[1].url + '|' + successCode)};
            // second call <l1>\r\n<body1>\r\n<l2>\r\n<body2>\r\n
            const fakeResponse2 = {responseText: fakeResponse1.responseText +
                                                 chunkify(testPages[0].url + '|' + successCode)};
            // third call <l1>\r\n<body1>\r\n<l2>\r\n<body2>\r\n<l3>\r\n<body3>\r\n
            const fakeResponse3 = {responseText: fakeResponse2.responseText +
                                                 chunkify(testPages[2].url + '|' + successCode)};
            progressClb(fakeResponse1, 1 / 3);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Uploading...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Yes');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Uploading...');
            progressClb(fakeResponse2, 2 / 3);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Yes');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Yes');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Uploading...');
            progressClb(fakeResponse3, 3 / 3);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Yes');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Yes');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Yes');
            //
            postCall.returnValue.then(() => {
                assert.ok(toastSpy.calledOnce, 'Should show message');
                assert.equal(toastSpy.getCall(0).args[0], 'Uploaded 3/3 pages.');
                assert.equal(toastSpy.getCall(0).args[1], 'success');
                assert.ok(!submitButton.disabled, "Should enable the submit button");
                toastSpy.restore();
                done();
            });
        });
    });
    QUnit.test('shows error if backend fails', assert => {
        const testPages = [{id:1,url:'/'},{id:2,url:'/foo'}];
        httpStub
            .onCall(0)
                .returns(Promise.resolve({responseText: JSON.stringify(testPages)}))
            .onCall(1)
                .returns(Promise.resolve({responseText: ''}));
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(WebsiteUploadView, null, null));
        //
        const done = assert.async();
        // Wait for GET /api/website/pages
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const pageTableRows = form.querySelectorAll('tbody tr');
            const submitButton = form.querySelector('input[type="submit"]');
            //
            submitButton.click();
            //
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Uploading...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Uploading...');
            const postCall = httpStub.getCall(1);
            // Simulate xhr.onprogress calls
            const progressClb = postCall.args[1].progress;
            const successCode = '0';
            const someErrorCode = '198';
            const chunkify = str => `${parseFloat(str.length).toString(16)}\r\n${str}\r\n`;
            const fakeResponse1 = {responseText: chunkify(testPages[0].url + '|' + successCode)};
            const fakeResponse2 = {responseText: fakeResponse1.responseText +
                                                 chunkify(testPages[1].url + '|' + someErrorCode)};
            progressClb(fakeResponse1, 1 / 2);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Yes');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Uploading...');
            progressClb(fakeResponse2, 2 / 2);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Yes');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Error');
            //
            postCall.returnValue.then(() => {
                assert.ok(toastSpy.calledOnce, 'Should show message');
                assert.equal(toastSpy.getCall(0).args[0], 'Uploaded 1/2 pages.');
                assert.equal(toastSpy.getCall(0).args[1], 'error');
                toastSpy.restore();
                done();
            });
        });
    });
});