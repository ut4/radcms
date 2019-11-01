import {cpanelApp, ControlPanel} from '../src/cpanel-app.js';
import services from '../../src/common-services.js';
import utils from '../../tests/my-test-utils.js';
const itu = Inferno.TestUtils;

class TestUiPanelImpl {
    getTitle() { return 'Test'; }
    getRoutes() { return []; }
    getIcon() { return 'feather'; }
    getMenuItems(currentPageData) { return [
        $el('div', {id: 'test-menu-item'}, currentPageData.page.url)
    ]; }
}

QUnit.module('ControlPanelComponent', hooks => {
    let httpStub;
    hooks.before(() => {
        cpanelApp._uiPanelImpls['Test'] = TestUiPanelImpl;
    });
    hooks.after(() => {
        delete cpanelApp._uiPanelImpls['Test'];
    });
    hooks.beforeEach(() => {
        httpStub = sinon.stub(services, 'myFetch');
    });
    hooks.afterEach(() => {
        httpStub.restore();
    });
    QUnit.test('renders ui panels for directive elements/tags', assert => {
        const currentPageData = {
            page: {url: '/home'},
            directiveElems: [
                {uiPanelType: 'Test', contentNodes: [{title:'t',body:'b',defaults:{id:1}}]}
            ],
            allContentNodes: []
        };
        httpStub
            .onCall(0).returns(Promise.resolve('0'))
            .onCall(1).returns(Promise.resolve({responseText:'[]'}));
        const cpanel = $el(ControlPanel, {currentPageData}, null);
        //
        const rendered = itu.renderIntoContainer(cpanel);
        const uiPanelList = itu.scryRenderedDOMElementsWithClass(rendered,
            'ui-panel');
        assert.strictEqual(uiPanelList.length, 1, 'Should list ui panels');
        const renderedTestDir = itu.findRenderedDOMElementWithClass(rendered,
            'ui-panel-Test');
        assert.ok(renderedTestDir !== undefined, 'Should render TestUiPanel for directiveElems[0]');
        assert.equal(renderedTestDir.querySelector('h4').textContent.substr(0,4), 'Test');
        assert.equal(renderedTestDir.querySelector('#test-menu-item').textContent, '/home');
    });
    QUnit.test('sets data-num-waiting-uploads attribute', assert => {
        const mockNum = '3';
        httpStub
            .onCall(0).returns(Promise.resolve({responseText:mockNum}))
            .onCall(1).returns(Promise.resolve({responseText:'[]'}));
        const done = assert.async();
        //
        const rendered = itu.renderIntoContainer($el(ControlPanel, {currentPageData: {
            page: {url: '/home'},
            directiveElems:[],
            allContentNodes:[]
        }}, null));
        const uploadLink = itu.scryRenderedDOMElementsWithTag(rendered,
            'a').find(btn => btn.textContent == 'Upload');
        assert.ok(uploadLink !== null, "Sanity check uploadLink != null");
        assert.equal(uploadLink.getAttribute('data-num-waiting-uploads'), null,
                     "Sanity check data-num-waiting-uploads == ''");
        //
        const waitingUploadsGetCall = httpStub.getCall(0);
        assert.ok(waitingUploadsGetCall !== null, "Sanity check ");
        waitingUploadsGetCall.returnValue // GET website/num-waiting-uploads
        .then(() => httpStub.getCall(1).returnValue) // GET website/templates
        .then(() => {
            assert.equal(uploadLink.getAttribute('data-num-waiting-uploads'),
                         mockNum);
            httpStub.restore();
            done();
        });
    });
    QUnit.test('handles a layout change', assert => {
        assert.expect(7);
        httpStub
            .onCall(0).returns(Promise.resolve({responseText:'0'}))
            .onCall(1).returns(Promise.resolve({responseText:'[{"fileName":'+
                '"a.jsx.htm","isOk":true},{"fileName":"b.jsx.htm","isOk":true}]'}))
            .onCall(2).returns(Promise.resolve({responseText:'{"numAffectedRows":1}'}));
        const redirectSpy = sinon.spy(window, 'myRedirect');
        //
        const originalLayout = 'b.jsx.htm';
        const currentPage = {url: '/foo', layoutFileName: originalLayout};
        const newLayout = 'a.jsx.htm';
        const done = assert.async();
        const rendered = itu.renderIntoContainer($el(ControlPanel, {currentPageData: {
            page: currentPage,
            directiveElems:[],
            allContentNodes:[],
        }}, null));
        // Wait until the constructor has loaded all data
        httpStub.getCall(0).returnValue // GET /num-waiting-uploads
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
            assert.equal(args[0], '/api/websites/current/page');
            assert.equal(args[1].method, 'PUT');
            assert.equal(args[1].headers['Content-Type'], 'application/json');
            assert.equal(args[1].data, JSON.stringify({
                url: currentPage.url,
                layoutFileName: newLayout
            }));
            return httpStub.getCall(2).returnValue;
        }).then(() => {
            assert.ok(redirectSpy.calledAfter(httpStub), 'Should redirect');
            assert.equal(redirectSpy.firstCall.args[0],
                         currentPage.url + '?rescan=usersOf:' + newLayout);
            redirectSpy.restore();
            done();
        });
    });
});
