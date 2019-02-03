import {app, InsaneControlPanel} from './../app.js';
import services from './../common-services.js';
import utils from './my-test-utils.js';
const itu = Inferno.TestUtils;

const testDirectiveImpl = {
    getTitle: () => 'Test',
    getMenuItems: _self => '...',
    getRoutes: () => []
};

QUnit.module('ControlPanelComponent', hooks => {
    let httpStub;
    hooks.before(() => {
        app._directiveImpls['TestDirective'] = testDirectiveImpl;
    });
    hooks.after(() => {
        delete app._directiveImpls['TestDirective'];
    });
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('lists current page directives', assert => {
        const currentPageData = {
            page: {url: '/home'},
            directiveInstances: [
                {type: 'TestDirective', contentNodes: [{title:'t',body:'b',defaults:{id:1}}]}
            ],
            allContentNodes: []
        };
        httpStub.onCall(0).returns(Promise.resolve(0));
        const getMenuItemsSpy = sinon.spy(app._directiveImpls['TestDirective'], 'getMenuItems');
        const cpanel = $el(InsaneControlPanel, {currentPageData}, null);
        //
        const rendered = itu.renderIntoContainer(cpanel);
        const directiveList = itu.scryRenderedDOMElementsWithClass(rendered,
            'directive');
        assert.strictEqual(directiveList.length, 1, 'Should list directives');
        const renderedTestDir = itu.findRenderedDOMElementWithClass(rendered,
            'directive-TestDirective');
        assert.ok(renderedTestDir !== undefined, 'Should render TestDirective');
        assert.equal(renderedTestDir.querySelector('h4').textContent.substr(0,4), 'Test');
        assert.ok(getMenuItemsSpy.calledOnce, 'Sanity check getMenuItemsSpy.calledOnce');
        assert.deepEqual(getMenuItemsSpy.getCall(0).args[0],
            currentPageData.directiveInstances[0],
            'Should pass "self" to testDirective.getMenuItems()');
        getMenuItemsSpy.restore();
    });
    QUnit.test('sets data-num-pending-changes attribute', assert => {
        const mockNumPendingChanges = '3';
        httpStub.onCall(0).returns(Promise.resolve({responseText:mockNumPendingChanges}));
        const done = assert.async();
        //
        const rendered = itu.renderIntoContainer($el(InsaneControlPanel, {currentPageData: {
            page: {url: '/home'},
            directiveInstances:[],
            allContentNodes:[]
        }}, null));
        const uploadButton = itu.scryRenderedDOMElementsWithTag(rendered,
            'button').find(btn => btn.textContent == 'Upload');
        assert.ok(uploadButton !== null, "Sanity check uploadButton != null");
        assert.equal(uploadButton.getAttribute('data-num-pending-changes'), null,
                     "Sanity check data-num-pending-changes == ''");
        //
        const pendingChangesGetCall = httpStub.getCall(0);
        assert.ok(pendingChangesGetCall !== null, "Sanity check ");
        pendingChangesGetCall.returnValue.then(() => {
            assert.equal(uploadButton.getAttribute('data-num-pending-changes'),
                         mockNumPendingChanges);
            httpStub.restore();
            done();
        });
    });
    QUnit.test('handles a layout change', assert => {
        assert.expect(6);
        httpStub
            .onCall(0).returns(Promise.resolve({responseText:'0'}))
            .onCall(1).returns(Promise.resolve({responseText:'[{"fileName":"a.jsx.htm"},{"fileName":"b.jsx.htm"}]'}))
            .onCall(2).returns(Promise.resolve({responseText:'{"numAffectedRows":1}'}));
        const redirectSpy = sinon.spy(window, 'myRedirect');
        //
        const originalLayout = 'b.jsx.htm';
        const currentPage = {url: '/foo', layoutFileName: originalLayout};
        const newLayout = 'a.jsx.htm';
        const done = assert.async();
        const rendered = itu.renderIntoContainer($el(InsaneControlPanel, {currentPageData: {
            page: currentPage,
            directiveInstances:[],
            allContentNodes:[],
        }}, null));
        // Wait until the constructor has loaded all data
        httpStub.getCall(0).returnValue // GET /num-pending-changes
        .then(() => httpStub.getCall(1).returnValue) // GET /website/templates
        .then(() => {
            // Open the dev tab
            const devTabButton = itu.findRenderedDOMElementWithClass(rendered,
                'tab-links').children[1]; // [0]==Content,[1]==For devs
            devTabButton.click();
            // Change the layout from the dropdown
            const layoutSelectEl = itu.findRenderedDOMElementWithTag(rendered,
                'select');
            utils.setDropdownIndex(0, layoutSelectEl); // Change from 1 to 0
            //
            assert.ok(httpStub.calledThrice);
            const args = httpStub.getCall(2).args;
            assert.equal(args[0], '/api/website/page');
            assert.equal(args[1].method, 'PUT');
            assert.equal(args[1].data,
                'url=' + encodeURIComponent(currentPage.url) +
                '&layoutFileName=' + encodeURIComponent(newLayout));
            return httpStub.getCall(2).returnValue;
        }).then(() => {
            assert.ok(redirectSpy.calledAfter(httpStub), 'Should redirect');
            assert.equal(redirectSpy.firstCall.args[0],
                         currentPage.url + '?rescan=full');
            redirectSpy.restore();
            done();
        });
    });
});
