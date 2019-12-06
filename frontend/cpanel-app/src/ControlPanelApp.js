import {components} from '../../rad-commons.js';
import uiPanelRegister from './UiPanelRegister.js';
import ContentAddView from './Content/ContentAddView.js';
import ContentEditView from './Content/ContentEditView.js';
import ContentTypesManageView from './ContentType/ContentTypesManageView.js';
import ContentTypeCreateView from './ContentType/ContentTypeCreateView.js';
import PluginsManageView from './Plugin/PluginsManageView.js';
import WebsitePackView from './Website/WebsitePackView.js';
const {MyLink, FeatherSvg, Toaster, Tabs} = components;

class ControlPanelApp extends preact.Component {
    /**
     * @param {ControlPanelAppProps} props
     */
    constructor(props) {
        super(props);
        this.currentPageUiPanels = [];
        this.adminUiPanels = [];
        this.userDefinedRoutes = [];
        this.siteInfo = {baseUrl: props.baseUrl, assetBaseUrl: props.assetBaseUrl,
                         currentPagePath: props.currentPagePath};
        const collectRoutes = this.makeRouteCollector();
        const makePanel = (dataFromBackend, to) => {
            const Cls = uiPanelRegister.getUiPanelImpl(dataFromBackend.impl);
            if (!Cls) return console.error(`UI panel ${dataFromBackend.impl} not implemented.`);
            to.push({UiImplClass: Cls, dataFromBackend});
            collectRoutes(Cls, dataFromBackend.impl);
        };
        props.contentPanels.forEach(p => {
            if (!Array.isArray(p.contentNodes)) p.contentNodes = [p.contentNodes];
            if (!p.contentNodes[0]) p.contentNodes = [];
            makePanel(p, this.currentPageUiPanels);
        });
        props.adminPanels.forEach(c => {
            makePanel(c, this.adminUiPanels);
        });
        this.state = {className: '', tabIdx: 0};
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', {className: this.state.className},
            $el(Toaster),
            $el('div', {id: 'control-panel'},
                $el(Tabs, {items: ['Sisältö', 'Devaajille'],
                           onChange: tabIdx => this.setState({tabIdx})}),
                $el('div', {className: this.state.tabIdx !== 0 ? 'hidden' : ''},
                    this.makeMainTabItems()),
                $el('div', {className: this.state.tabIdx !== 1 ? 'hidden' : ''},
                    this.makeDevTabItems()),
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
                },
                $el(ContentAddView, {path: '/add-content/:initialContentTypeName?'}),
                $el(ContentEditView, {path: '/edit-content/:id/:contentTypeName/:publish?'}),
                $el(ContentTypesManageView, {path: '/manage-content-types'}),
                $el(ContentTypeCreateView, {path: '/create-content-type'}),
                $el(PluginsManageView, {path: '/manage-plugins'}),
                $el(WebsitePackView, {path: '/pack-website'}),
                ...this.userDefinedRoutes
            )
        );
    }
    /**
     * @access private
     */
    makeMainTabItems() {
        return $el('div', null,
            $el('section', {className: 'quick-links'},
                $el('h3', null, 'Pikalinkit:'),
                $el('div', null,
                    $el(MyLink, {to: '/add-content'},
                        $el(FeatherSvg, {iconId: 'plus-circle'}), 'Luo sisältöä'
                    ),
                    $el(MyLink, {to: '/todo'},
                        $el(FeatherSvg, {iconId: 'save'}), 'Link2'
                    )
                )
            ),
            $el('section', null,
                $el('h3', null, 'Tällä sivulla:'),
                this.currentPageUiPanels.length
                    ? this.currentPageUiPanels.map(panelCfg =>
                        $el(ControlPanelApp.ContentTabSection, {panelCfg, siteInfo: this.siteInfo})
                    )
                    : [
                        $el('div', {className: 'empty'}, 'Ei muokattavaa sisältöä.')
                    ]
            )
        );
    }
    /**
     * @access private
     */
    makeDevTabItems() {
        return $el('div', {className: 'list list-small'},
            this.adminUiPanels.map(panelCfg =>
                $el(ControlPanelApp.AdminTabSection, {panelCfg, siteInfo: this.siteInfo})
            ).concat($el('div', null,
                $el('h3', null, 'Sivusto'),
                $el('div', null, $el(MyLink, {to: '/pack-website'}, 'Paketoi')),
            ), $el('div', null,
                $el('h3', null, 'Lisäosat'),
                $el('div', null, $el(MyLink, {to: '/manage-plugins'}, 'Hallitse')),
            ))
        );
    }
    /**
     * @access private
     */
    makeRouteCollector() {
        const uniqueImpls = {};
        return (PanelCls, implName) => {
            if (!uniqueImpls.hasOwnProperty(implName)) {
                uniqueImpls[implName] = 1;
                if (typeof PanelCls.getRoutes === 'function')
                    this.userDefinedRoutes.push(...(PanelCls.getRoutes() || []));
            }
        };
    }
}

ControlPanelApp.ContentTabSection = class extends preact.Component {
    /**
     * @param {{panelCfg: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.Renderer = props.panelCfg.UiImplClass;
        this.dataFromBackend = props.panelCfg.dataFromBackend;
        this.className = `ui-panel ui-panel-${this.dataFromBackend.impl}`;
        this.state = {title: '', icon: '', collapsed: false};
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', {className: this.className},
            $el('h4', null,
                $el('span', null,
                    this.state.icon && $el(FeatherSvg, {iconId: this.state.icon || 'feather'}),
                    this.state.title
                ),
                $el('button', {onClick: () => this.setState({collapsed: !this.state.collapsed})},
                    '[' + (!this.state.collapsed ? '-' : '+') + ']'
                )
            ),
            $el('div', {className: !this.state.collapsed ? '' : 'hidden'},
                $el(this.Renderer, {dataFromBackend: this.dataFromBackend,
                                    siteInfo: this.props.siteInfo,
                                    ref: cmp => {
                                        if (cmp && !this.state.title) this.setState({
                                            title: cmp.getTitle() || '-',
                                            icon: cmp.getIcon() || 'feather',
                                        });
                                    }}))
        );
    }
};

ControlPanelApp.AdminTabSection = class extends preact.Component {
    /**
     * @param {{panelCfg: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.state = {title: ''};
        this.Renderer = props.panelCfg.UiImplClass;
        this.dataFromBackend = props.panelCfg.dataFromBackend;
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null,
            $el('h3', null,
                this.state.title,
                $el('span', null, 'Lisäosa')
            ),
            $el(this.Renderer, {dataFromBackend: this.dataFromBackend,
                                siteInfo: this.props.siteInfo,
                                ref: cmp => {
                                    if (cmp && !this.state.title)
                                        this.setState({title: cmp.getTitle() || '-'});
                                }})
        );
    }
};

export default ControlPanelApp;
