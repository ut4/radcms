import {myLink, contentNodeList, featherSvg, Toaster} from '../../src/common-components.js';
import uiPanelRegister from './UiPanelRegister.js';
import ContentAddView from './Content/ContentAddView.js';
import ContentEditView from './Content/ContentEditView.js';
import ContentTypesManageView from './ContentType/ContentTypesManageView.js';
import ContentTypeCreateView from './ContentType/ContentTypeCreateView.js';
import PluginsManageView from './Plugin/PluginsManageView.js';
import './FormModule.js';

const cpanelApp = {
    _uiPanelImpls: {
        'List': GenericListUIPanelImpl,
        'Generic': GenericUIPanelImpl,
        'StaticMenu': StaticMenuUIPanelImpl
    },
    /**
     * @param {string} name
     * @param {Object} impl
     * @throws {TypeError}
     */
    registerUiPanelImpl: function(name, impl) {
        if (this._uiPanelImpls.hasOwnProperty(name))
            throw new TypeError('Impl \''+name+'\' already exists.');
        this._uiPanelImpls[name] = impl;
    },
    /**
     * @param {string} name
     * @returns {Object|undefined}
     */
    getUiPanelImpl: function(name) {
        return this._uiPanelImpls[name];
    }
};

/*
 * The root component of cpanel.html.
 */
class ControlPanel extends preact.Component {
    /**
     * @param {{page: {url: string;}; panels: Array<FrontendPanelConfig>;}} props
     */
    constructor(props) {
        super(props);
        this.currentPageUiPanels = [];
        const allContentNodes = [];
        props.currentPageData.panels.forEach(obj => {
            if (!Array.isArray(obj.contentNodes)) obj.contentNodes = [obj.contentNodes];
            if (!obj.contentNodes[0]) obj.contentNodes = [];
            allContentNodes.push(...obj.contentNodes);
            const Cls = cpanelApp.getUiPanelImpl(obj.type);
            if (!Cls) return;
            this.currentPageUiPanels.push(new Cls(obj));
        });
        this.looseContentNodes = allContentNodes.filter(n =>
            !props.currentPageData.panels.some(panel =>
                panel.contentNodes.some(n2 => panel.id+n.id == panel.id+n2.id)
            )
        );
        this.state = {className: '', templates: [], selectedTemplateIdx: null,
                      tabA: true};
    }
    render() {
        return $el('div', {className: this.state.className},
            $el(Toaster, null, null),
            $el('div', {id: 'control-panel'},
                $el('div', {className: 'tab-links'},
                    $el('button', {
                        className: this.state.tabA ? 'current' : '',
                        onClick: () => { if (!this.state.tabA) this.setState({tabA: true}); }
                    }, 'Sisältö'),
                    $el('button', {
                        className: !this.state.tabA ? 'current' : '',
                        onClick: () => { if (this.state.tabA) this.setState({tabA: false}); }
                    }, 'Devaajille')
                ),
                $el('div', {className: !this.state.tabA ? 'hidden' : ''}, this.makeMainTabItems()),
                $el('div', {className: this.state.tabA ? 'hidden' : ''}, this.makeDevTabItems()),
                $el('h1', null, 'RadCMS')
            ),
            $el(preactRouter,
                {
                    history: History.createHashHistory(),
                    onChange: e => {
                        const isIndex = e.url === '/';
                        if (!e.current && !isIndex) return;
                        window.parent.setIframeVisible(!isIndex);
                        this.setState({className: !isIndex ? 'open' : ''});
                    }
                }, [
                    $el(ContentAddView, {path: '/add-content/:initialContentTypeName?'}, null),
                    $el(ContentEditView, {path: '/edit-content/:contentNodeId'}, null),
                    $el(ContentTypesManageView, {path: '/manage-content-types'}, null),
                    $el(ContentTypeCreateView, {path: '/create-content-type'}, null),
                    $el(PluginsManageView, {path: '/manage-plugins'}, null),
                ].concat(...this.currentPageUiPanels.map(panel=>panel.getRoutes()))
            )
        );
    }
    makeMainTabItems() {
        return $el('div', null,
            $el('section', {className: 'quick-links'},
                $el('h3', null, 'Pikalinkit:'),
                $el('div', null,
                    myLink('/todo', [featherSvg('upload-cloud'), 'Link1'],
                           false),
                    myLink('/todo', [featherSvg('save'), 'Link2'])
                )
            ),
            $el('section', null,
                $el('h3', null, 'Tällä sivulla:'),
                ...this.currentPageUiPanels.map(panel =>
                    $el(ControlPanelSection, {
                        title: panel.getTitle(),
                        icon: typeof panel.getIcon == 'function' ? panel.getIcon() : null,
                        className: 'ui-panel ui-panel-' + panel.type
                    }, panel.getMenuItems(this.props))
                ).concat(this.looseContentNodes.length ? $el(ControlPanelSection, {
                    title: 'Other',
                    className: ''
                }, contentNodeList({
                    cnodes: this.looseContentNodes,
                    createLinkText: 'Lisää sisältöä',
                    currentPageUrl: this.props.currentPageData.page.url
                })) : null)
            )
        );
    }
    makeDevTabItems() {
        return $el('div', {className: 'list list-small'},
            $el('div', null,
                $el('h3', null, 'Lisäosat'),
                $el('div', null, myLink('/manage-plugins', 'Hallitse')),
            )
        );
    }
}

class ControlPanelSection extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {collapsed: false};
    }
    render() {
        return $el('div', {className: this.props.className},
            $el('h4', null,
                $el('span', null,
                    featherSvg(this.props.icon || 'feather'),
                    this.props.title
                ),
                $el('button', {onClick: () => this.setState({collapsed: !this.state.collapsed})},
                    '[' + (!this.state.collapsed ? '-' : '+') + ']'
                )
            ),
            $el('div', {
                className: !this.state.collapsed ? '' : 'hidden'
            }, this.props.children)
        );
    }
}

export {cpanelApp, ControlPanel};
