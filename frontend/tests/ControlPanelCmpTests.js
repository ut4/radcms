import {app, InsaneControlPanel} from './../app.js';
import services from './../common-services.js';
const itu = Inferno.TestUtils;

const testDirectiveImpl = {
    getTitle: () => 'Test',
    getMenuItems: self => '...',
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
        const directiveList = itu.findRenderedDOMElementWithClass(rendered,
            'current-page-directive-list').children;
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
        }).catch(err => { console.log('err');
        });
    });
});
