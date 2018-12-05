import {app, InsaneControlPanel} from './../app.js';
const itu = Inferno.TestUtils;

const testDirectiveImpl = {
    getTitle: () => 'Test',
    getMenuItems: self => '...',
    getRoutes: () => []
};

QUnit.module('ControlPanelComponent', hooks => {
    hooks.before(() => {
        app._directiveImpls['TestDirective'] = testDirectiveImpl;
    });
    hooks.after(() => {
        delete app._directiveImpls['TestDirective'];
    });
    QUnit.test('lists current page directives', assert => {
        const currentPageData = {
            directiveInstances: [
                {type: 'TestDirective', components: [{title:'t',body:'b',cmp:{id:1}}]}
            ],
            allComponents: []
        };
        const getMenuItemsSpy = sinon.spy(app._directiveImpls['TestDirective'], 'getMenuItems');
        const cpanel = $el(InsaneControlPanel, {currentPageData}, null);
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
});
