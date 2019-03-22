import {WebsiteListView, WebsiteCreateView} from './../app-website-views.js';
import {WebsiteGenerateView, WebsiteUploadView, UploadStatus} from './../website-views.js';
import services from './../common-services.js';
import utils from './my-test-utils.js';
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
        formButtons.querySelector('button[type="submit"]').click();
        //
        const postCall = httpStub.getCall(0);
        assert.ok(postCall !== null, 'Should send request to backend');
        assert.equal(postCall.args[0], '/api/websites/current/generate');
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
        formButtons.querySelector('button[type="submit"]').click();
        //
        const postCall = httpStub.getCall(0);
        assert.ok(postCall !== null, 'Should send request to backend');
        assert.equal(postCall.args[0], '/api/websites/current/generate');
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
            const successCode = '0';
            const makeChunkResp = function(isPage, resourceUrl) {
                const str = `${isPage?'page':'file'}|${resourceUrl}|${successCode}`;
                return `${parseFloat(str.length).toString(16)}\r\n${str}\r\n`;
            };
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
            const successCode = '0';
            const someErrorCode = '1998';
            const chunkify = str => `${parseFloat(str.length).toString(16)}\r\n${str}\r\n`;
            const fakeResponse1 = {responseText: chunkify('page|' + testPages[0].url + '|' + successCode)};
            const fakeResponse2 = {responseText: fakeResponse1.responseText +
                                                 chunkify('page|' + testPages[1].url + '|' + someErrorCode)};
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