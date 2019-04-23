import {WebsiteGenerateView, WebsiteUploadView, UploadStatus} from '../src/website-views.js';
import services from '../../src/common-services.js';
import utils from '../../tests/my-test-utils.js';
const itu = Inferno.TestUtils;

QUnit.module('WebsiteGenerateViewComponent', hooks => {
    let httpStub;
    let emptySiteGraphResponse = '{"pages":[],"files":[]}';
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
        httpStub.onCall(0).returns(Promise.resolve({responseText: emptySiteGraphResponse}));
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('sends request to backend', assert => {
        const testRespText = JSON.stringify({
            wrotePagesNum: 5,
            wroteFilesNum: 2,
            tookSecs: 0.002672617,
            totalPages: 6,
            totalFiles: 2,
            issues: []
        });
        httpStub.onCall(1).returns(Promise.resolve({responseText: testRespText}));
        //
        const done = assert.async();
        const testSitePath = '/my/site/path/';
        const tree = itu.renderIntoDocument($el(WebsiteGenerateView,
            {sitePath: testSitePath}, null));
        httpStub.getCall(0).returnValue.then(() => { // Wait for GET /website/site-graph
            //
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            const contentEl = itu.findRenderedDOMElementWithTag(tree, 'form').querySelector('div');
            formButtons.querySelector('button[type="submit"]').click();
            //
            const postCall = httpStub.getCall(1);
            assert.ok(postCall !== null, 'Should send request to backend');
            assert.equal(postCall.args[0], '/api/websites/current/generate');
            assert.equal(postCall.args[1].method, 'POST');
            assert.equal(postCall.args[1].data, emptySiteGraphResponse);
            postCall.returnValue.then(resp => {
                const r = JSON.parse(resp.responseText);
                assert.equal(contentEl.children[0].textContent,
                'Wrote ' + r.wrotePagesNum + '/' + r.totalPages + ' pages and copied ' +
                r.wroteFilesNum + '/' + r.totalFiles + ' asset files to "' + testSitePath +
                'out" in ' + r.tookSecs.toFixed(6) + ' secs.');
                done();
            });
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
        httpStub.onCall(1).returns(Promise.resolve({responseText}));
        //
        const done = assert.async();
        const tree = itu.renderIntoDocument($el(WebsiteGenerateView,
            {sitePath: '/'}, null));
        httpStub.getCall(0).returnValue.then(() => { // Wait for GET /website/site-graph
            const formButtons = itu.findRenderedDOMElementWithClass(tree, 'form-buttons');
            formButtons.querySelector('button[type="submit"]').click();
            //
            const postCall = httpStub.getCall(1);
            assert.ok(postCall !== null, 'Should send request to backend');
            assert.equal(postCall.args[0], '/api/websites/current/generate');
            assert.equal(postCall.args[1].method, 'POST');
            postCall.returnValue.then(() => {
                const form = itu.findRenderedDOMElementWithTag(tree, 'form');
                const firstError = form.children[1].children[2];
                assert.equal(firstError.textContent, '/some-url: Some error.');
                done();
            });
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
            {url:'/home',uploadStatus:UploadStatus.NOT_UPLOADED},
            {url:'/foo',uploadStatus:UploadStatus.OUTDATED},
            {url:'/bar',uploadStatus:UploadStatus.DELETED}
        ];
        const testFiles = [
            {url:'foo.css',uploadStatus:UploadStatus.NOT_UPLOADED},
            {url:'bar.js',uploadStatus:UploadStatus.DELETED}
        ];
        httpStub
            .onCall(0)
                .returns(Promise.resolve({responseText: JSON.stringify({
                    pages: testPages,
                    files: testFiles
                })}))
            .onCall(1)
                .returns(Promise.resolve({responseText: ''}));
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(WebsiteUploadView, null, null));
        //
        const done = assert.async();
        // Wait for GET /api/websites/current/upload-statuses
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const remoteUrlInput = form.querySelector('input[name="ftpRemoteUrl"]');
            const usernameInput = form.querySelector('input[name="ftpUsername"]');
            const passwordInput = form.querySelector('input[name="ftpPassword"]');
            const tables = form.querySelectorAll('table');
            const pageTableRows = tables[0].querySelectorAll('tbody tr');
            const fileTableRows = tables[1].querySelectorAll('tbody tr');
            const submitButton = form.querySelector('button[type="submit"]');
            //
            assert.equal(remoteUrlInput.value, 'ftp://ftp.mysite.net/public_html');
            assert.equal(usernameInput.value, 'ftp@mysite.net');
            assert.equal(pageTableRows.length, testPages.length);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Add');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Update');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Remove');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Add');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Remove');
            //
            utils.setInputValue('ftp://ftp.foo.net/htdocs/', remoteUrlInput);
            utils.setInputValue('ftp@foo.net', usernameInput);
            utils.setInputValue('asd', passwordInput);
            submitButton.click();
            //
            assert.ok(submitButton.disabled, "Should disable the submit button");
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Pending...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Pending...');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Pending...');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Pending...');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Pending...');
            const postCall = httpStub.getCall(1);
            assert.ok(postCall !== null, 'Should send request to backend');
            assert.equal(postCall.args[0], '/api/websites/current/upload');
            assert.equal(postCall.args[1].method, 'POST');
            assert.equal(postCall.args[1].headers['Content-Type'], 'application/json');
            assert.equal(postCall.args[1].data, JSON.stringify({
                remoteUrl: remoteUrlInput.value,
                username: usernameInput.value,
                password: passwordInput.value,
                pageUrls: testPages.map(page => ({
                    url: page.url,
                    isDeleted: page.uploadStatus!=UploadStatus.DELETED?0:1
                })),
                fileNames: testFiles.map(file => ({
                    fileName: file.url,
                    isDeleted: file.uploadStatus!=UploadStatus.DELETED?0:1
                }))
            }));
            // Simulate xhr.onprogress calls
            const progressClb = postCall.args[1].progress;
            const makeChunkResp = (isPage, resourceUrl) =>
                `${isPage?'page':'file'}|${resourceUrl}|ok|`
            ;
            const fakeResponse1 = {responseText: makeChunkResp(false, testFiles[0].url)};
            const fakeResponse2 = {responseText: fakeResponse1.responseText +
                                                 makeChunkResp(false, testFiles[1].url)};
            const fakeResponse3 = {responseText: fakeResponse2.responseText +
                                                 makeChunkResp(true, testPages[1].url)};
            const fakeResponse4 = {responseText: fakeResponse3.responseText +
                                                 makeChunkResp(true, testPages[0].url)};
            const fakeResponse5 = {responseText: fakeResponse4.responseText +
                                                 makeChunkResp(true, testPages[2].url)};
            progressClb(fakeResponse1, 1 / 5);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Pending...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Pending...');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Pending...');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Ok');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Pending...');
            progressClb(fakeResponse2, 2 / 5);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Pending...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Pending...');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Pending...');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Ok');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Ok');
            progressClb(fakeResponse3, 3 / 5);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Pending...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Ok');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Pending...');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Ok');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Ok');
            progressClb(fakeResponse4, 4 / 5);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Ok');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Ok');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Pending...');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Ok');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Ok');
            progressClb(fakeResponse5, 5 / 5);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Ok');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Ok');
            assert.equal(pageTableRows[2].textContent, testPages[2].url + 'Ok');
            assert.equal(fileTableRows[0].textContent, testFiles[0].url + 'Ok');
            assert.equal(fileTableRows[1].textContent, testFiles[1].url + 'Ok');
            //
            postCall.returnValue.then(() => {
                assert.ok(toastSpy.calledOnce, 'Should show message');
                assert.equal(toastSpy.getCall(0).args[0], 'Uploaded 3/3 pages and 2/2 files.');
                assert.equal(toastSpy.getCall(0).args[1], 'success');
                assert.ok(!submitButton.disabled, "Should enable the submit button");
                toastSpy.restore();
                done();
            });
        });
    });
    QUnit.test('shows error if backend fails', assert => {
        const testPages = [{id:1,url:'/home'},{id:2,url:'/foo'}];
        httpStub
            .onCall(0)
                .returns(Promise.resolve({responseText: JSON.stringify({
                    pages: testPages,
                    files: []
                })}))
            .onCall(1)
                .returns(Promise.resolve({responseText: ''}));
        const toastSpy = sinon.spy(window, 'toast');
        const tree = itu.renderIntoDocument($el(WebsiteUploadView, null, null));
        //
        const done = assert.async();
        // Wait for GET /api/websites/current/upload-statuses
        httpStub.getCall(0).returnValue.then(() => {
            const form = itu.findRenderedDOMElementWithTag(tree, 'form');
            const pageTableRows = form.querySelectorAll('tbody tr');
            const submitButton = form.querySelector('button[type="submit"]');
            //
            submitButton.click();
            //
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Pending...');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Pending...');
            const postCall = httpStub.getCall(1);
            // Simulate xhr.onprogress calls
            const progressClb = postCall.args[1].progress;
            const fakeResponse1 = {responseText: 'page|' + testPages[0].url + '|ok|'};
            const fakeResponse2 = {responseText: fakeResponse1.responseText +
                                                 'page|' + testPages[1].url + '|error message|'};
            progressClb(fakeResponse1, 1 / 2);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Ok');
            assert.equal(pageTableRows[1].textContent, testPages[1].url + 'Pending...');
            progressClb(fakeResponse2, 2 / 2);
            assert.equal(pageTableRows[0].textContent, testPages[0].url + 'Ok');
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