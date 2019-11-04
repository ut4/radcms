import {myLink, contentNodeList, featherSvg, Toaster} from '../../src/common-components.js';
import uiPanelRegister from './UiPanelRegister.js';
import ContentAddView from './Content/ContentAddView.js';
import ContentEditView from './Content/ContentEditView.js';
import ContentTypesManageView from './ContentType/ContentTypesManageView.js';
import ContentTypeCreateView from './ContentType/ContentTypeCreateView.js';
import PluginsManageView from './Plugin/PluginsManageView.js';

class ControlPanelApp extends preact.Component {
    /**
     * @param {ControlPanelAppProps} props
     */
    constructor(props) {
        super(props);
        this.currentPageUiPanels = [];
        this.adminUiPanels = [];
        const makePanel = (config, to) => {
            const Cls = uiPanelRegister.getUiPanelImpl(config.impl);
            if (!Cls) return console.error(`UI panel ${config.impl} not implemented.`);
            to.push(new Cls(config));
        };
        const allContentNodes = [];
        props.contentPanels.forEach(c => {
            if (!Array.isArray(c.contentNodes)) c.contentNodes = [c.contentNodes];
            if (!c.contentNodes[0]) c.contentNodes = [];
            allContentNodes.push(...c.contentNodes);
            makePanel(c, this.currentPageUiPanels);
        });
        this.looseContentNodes = allContentNodes.filter(n =>
            !props.contentPanels.some(panel =>
                panel.contentNodes.some(n2 => panel.id + n.id == panel.id + n2.id)
            )
        );
        props.adminPanels.forEach(c => {
            makePanel(c, this.adminUiPanels);
        });
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
                $el('h1', null,
                    $el('img', {src: this.props.assetBaseUrl + 'frontend/assets/logo.png'}),
                    'RadCMS'
                )
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
                ].concat(...this.adminUiPanels.map(panel=>panel.getRoutes()))
                 .concat(...this.currentPageUiPanels.map(panel=>panel.getRoutes()))
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
                        className: 'ui-panel ui-panel-' + panel.getName()
                    }, panel.getMenuItems(this.props))
                ).concat(this.looseContentNodes.length ? $el(ControlPanelSection, {
                    title: 'Other',
                    className: ''
                }, contentNodeList({
                    cnodes: this.looseContentNodes,
                    createLinkText: 'Lisää sisältöä',
                    currentPageUrl: this.props.page.url
                })) : null)
            )
        );
    }
    makeDevTabItems() {
        return $el('div', {className: 'list list-small'},
            ...this.adminUiPanels.map(panel =>
                $el('div', null,
                    $el('h3', null, panel.getTitle(), $el('span', null, 'Lisäosa')),
                    ...(panel.getMenuItems() || []),
                )
            )
            .concat($el('div', null,
                $el('h3', null, 'Lisäosat'),
                $el('div', null, myLink('/manage-plugins', 'Hallitse')),
            ))
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

export default ControlPanelApp;
