import {components} from '../../rad-commons.js';
import ContentAddView from './Content/ContentAddView.js';
import ContentManageView from './Content/ContentManageView.js';
import ContentEditView from './Content/ContentEditView.js';
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
        const onEachMakePanel = this.makeContentPanelCreateVisitor();
        const makePanel = (dataFromBackend, to, isAdminPanel) => {
            const Cls = props.uiPanelRegister.getUiPanelImpl(dataFromBackend.impl);
            if (!Cls) return console.error(`UI panel ${dataFromBackend.impl} not implemented.`);
            to.push({UiImplClass: Cls, dataFromBackend});
            onEachMakePanel(Cls, dataFromBackend, isAdminPanel);
        };
        props.contentPanels.forEach(p => {
            if (!Array.isArray(p.contentNodes)) p.contentNodes = [p.contentNodes];
            if (!p.contentNodes[0]) p.contentNodes = [];
            makePanel(p, this.currentPageUiPanels, false);
        });
        props.adminPanels.forEach(c => {
            makePanel(c, this.adminUiPanels, true);
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
                        if (!isIndex) {
                            this.setState({className: 'open'});
                            this.props.mainWindowIframeEl.classList.add('expanded');
                        } else {
                            this.setState({className: ''});
                            this.props.mainWindowIframeEl.classList.remove('expanded');
                        }
                    }
                },
                $el(ContentAddView, {path: '/add-content/:initialContentTypeName?'}),
                $el(ContentManageView, {path: '/manage-content'}),
                $el(ContentEditView, {path: '/edit-content/:id/:contentTypeName/:publish?'}),
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
                    )
                )
            ),
            $el('section', null,
                $el('h3', null, 'Tällä sivulla:'),
                this.currentPageUiPanels.length
                    ? this.currentPageUiPanels.map(panelCfg =>
                        $el(ControlPanelApp.ContentTabSection,
                            {panelCfg, siteInfo: this.siteInfo,
                             mainWindowDoc: this.props.mainWindowDoc})
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
                $el('h3', null, 'Sisältö'),
                $el('div', null,
                    $el('div', null, $el(MyLink, {to: '/manage-content'}, 'Selaa')),
                    $el('div', null, $el(MyLink, {to: '/add-content'}, 'Luo'))
                ),
            ), $el('div', null,
                $el('h3', null, 'Lisäosat'),
                $el('div', null, $el(MyLink, {to: '/manage-plugins'}, 'Selaa')),
            ), $el('div', null,
                $el('h3', null, 'Sivusto'),
                $el('div', null, $el(MyLink, {to: '/pack-website'}, 'Paketoi')),
            ))
        );
    }
    /**
     * @access private
     */
    makeContentPanelCreateVisitor() {
        const uniqueImpls = {};
        const uniqueHighlighSelectors = {};
        return (PanelCls, panelCfg, isAdminPanel) => {
            const implName = panelCfg.impl;
            if (!uniqueImpls.hasOwnProperty(implName)) {
                uniqueImpls[implName] = 1;
                if (typeof PanelCls.getRoutes === 'function')
                    this.userDefinedRoutes.push(...(PanelCls.getRoutes() || []));
            }
            if (!isAdminPanel && panelCfg.highlightSelector) {
                const s = panelCfg.highlightSelector;
                if (!uniqueHighlighSelectors.hasOwnProperty(s))
                    uniqueHighlighSelectors[s] = -1;
                panelCfg.selectorIndex = ++uniqueHighlighSelectors[s];
            }
        };
    }
}

ControlPanelApp.ContentTabSection = class extends preact.Component {
    /**
     * @param {{panelCfg: FrontendPanelConfig; siteInfo: SiteInfo; mainWindowDoc: HTMLDocument;}} props
     */
    constructor(props) {
        super(props);
        this.Renderer = props.panelCfg.UiImplClass;
        this.dataFromBackend = props.panelCfg.dataFromBackend;
        this.className = `ui-panel ui-panel-${this.dataFromBackend.impl}`;
        this.state = {title: '', icon: '', collapsed: false};
        this.toggleHighlight = makeHighlightToggler(this.dataFromBackend.highlightSelector,
                                                    this.dataFromBackend.selectorIndex,
                                                    props.mainWindowDoc);
    }
    /**
     * @access protected
     */
    render() {
        const isMobile = false;
        return $el('div', {className: this.className},
            $el('h4', null,
                $el('span', !isMobile ? {onMouseOver: this.toggleHighlight,
                                         onMouseOut: this.toggleHighlight}
                                      : {onClick: this.toggleHighlight},
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

/**
 * @param {string} selector
 * @param {number} selectorIndex
 * @param {HTMLDocument} mainWindowDoc
 * @return {Function} togglerFn
 */
function makeHighlightToggler(selector, selectorIndex, mainWindowDoc) {
    const makeOverlay = el => {
        const out = mainWindowDoc.createElement('div');
        out.id = 'rad-highlight-overlay';
        const r = el.getBoundingClientRect();
        out.style = 'width:' + r.width + 'px' +
                  ';height:' + r.height + 'px' +
                  ';top:' + (r.top + window.top.scrollY) + 'px' +
                  ';left:' + (r.left + window.top.scrollX) + 'px';
        return out;
    };
    const cache = {};
    //
    return () => {
        if (!selector) return;
        let node = cache[selector];
        if (!node) {
            node = mainWindowDoc.querySelectorAll(selector)[selectorIndex];
            if (!node) return;
            cache[selector] = node;
        }
        let over = mainWindowDoc.getElementById('rad-highlight-overlay');
        if (!over) {
            over = makeOverlay(node);
            mainWindowDoc.body.appendChild(over);
        } else {
            over.parentElement.removeChild(over);
        }
    };
}

export default ControlPanelApp;
