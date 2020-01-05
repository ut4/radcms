import {components, services} from '../../rad-commons.js';
import {uiPanelRegister} from '../../rad-cpanel.js';
import ContentAddView from './Content/ContentAddView.js';
import ContentManageView from './Content/ContentManageView.js';
import ContentEditView from './Content/ContentEditView.js';
import PluginsManageView from './Plugin/PluginsManageView.js';
import WebsitePackView from './Website/WebsitePackView.js';
const {MyLink, FeatherSvg, Toaster} = components;

class ControlPanelApp extends preact.Component {
    /**
     * @param {dataFromBackend: ControlPanelAppProps || {};} props
     */
    constructor(props) {
        super(props);
        this.siteInfo = null;
        this.siteIframeDoc = null;
        this.state = this.makeState(props.dataFromBackend);
    }
    /**
     * @param {ControlPanelAppProps} dataFromBackend
     * @access public
     */
    setup(dataFromBackend) {
        this.setState(this.makeState(dataFromBackend));
    }
    /**
     * @access private
     */
    makeState(dataFromBackend) {
        const newState = {contentPanels: []};
        if (dataFromBackend) {
            const onEachMakePanel = this.makeContentPanelCreateVisitor(newState);
            const makePanel = (dataFromBackend, to, isAdminPanel) => {
                const Cls = uiPanelRegister.getUiPanelImpl(dataFromBackend.impl);
                if (!Cls) return window.console.error(`UI panel ${dataFromBackend.impl} not implemented.`);
                to.push({UiImplClass: Cls, dataFromBackend});
                onEachMakePanel(Cls, dataFromBackend, isAdminPanel);
            };
            //
            if (!this.siteIframeDoc) {
                services.config.baseUrl = dataFromBackend.baseUrl;
                services.config.assetBaseUrl = dataFromBackend.assetBaseUrl;
                this.siteInfo = {baseUrl: dataFromBackend.baseUrl,
                                assetBaseUrl: dataFromBackend.assetBaseUrl,
                                currentPagePath: dataFromBackend.currentPagePath};
                const siteIframe = document.getElementById('rad-site-iframe');
                this.siteIframeDoc = siteIframe.contentDocument;
                //
                newState.adminPanels = [];
                newState.userDefinedRoutes = [];
                dataFromBackend.adminPanels.forEach(c => {
                    makePanel(c, newState.adminPanels, true);
                });
                newState.routesUpdated = true;
            } else {
                this.siteIframeDoc = document.getElementById('rad-site-iframe').contentDocument;
            }
            //
            dataFromBackend.contentPanels.forEach(p => {
                if (!Array.isArray(p.contentNodes)) p.contentNodes = [p.contentNodes];
                if (!p.contentNodes[0]) p.contentNodes = [];
                makePanel(p, newState.contentPanels, false);
            });
        }
        return newState;
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null,
            $el(Toaster),
            $el('div', {id: 'cpanel'},
                $el('div', {className: 'top-row'},
                    $el('button', {className: 'icon-button'},
                        $el(FeatherSvg, {iconId: 'arrow-left'})
                    ),
                    $el('div', {id: 'logo'}, 'RAD', $el('span', null, 'Cms'))
                ),
                $el('section', {className: 'quick-links'}, $el('div', null,
                    $el('button', {onClick: () => { services.redirect('/add-content'); },
                                  className: 'icon-button'},
                        $el(FeatherSvg, {iconId: 'edit-2'}),
                        $el('span', null, 'Luo sisältöä')
                    )
                )),
                $el('section', null, $el('div', null,
                    this.state.contentPanels.map(panelCfg =>
                        $el(ControlPanelApp.ContentTabSection,
                            {panelCfg, siteInfo: this.siteInfo,
                            siteIframeDoc: this.siteIframeDoc, key: panelCfg.dataFromBackend.title})
                    )
                )),
                $el('section', null, $el('div', null,
                    this.state.adminPanels.map(panelCfg =>
                        $el(ControlPanelApp.PluginAdminTabSection, {panelCfg, siteInfo: this.siteInfo})
                    ).concat(
                        $el(ControlPanelApp.AdminTabSection, {title: 'Kaikki sisältö', icon: 'database'},
                            $el(MyLink, {to: '/manage-content'}, 'Selaa'),
                            $el(MyLink, {to: '/add-content'}, 'Luo')
                        ),
                        $el(ControlPanelApp.AdminTabSection, {title: 'Lisäosat', icon: 'package'},
                            $el(MyLink, {to: '/manage-plugins'}, 'Selaa')
                        ),
                        $el(ControlPanelApp.AdminTabSection, {title: 'Sivusto', icon: 'tool'},
                            $el(MyLink, {to: '/pack-website'}, 'Paketoi')
                        )
                    )
                ))
            ),
            this.state.routesUpdated ? $el(preactRouter,
                {history: History.createHashHistory()},
                $el(ContentAddView, {path: '/add-content/:initialContentTypeName?'}),
                $el(ContentManageView, {path: '/manage-content'}),
                $el(ContentEditView, {path: '/edit-content/:id/:contentTypeName/:publish?'}),
                $el(PluginsManageView, {path: '/manage-plugins'}),
                $el(WebsitePackView, {path: '/pack-website'}),
                ...this.state.userDefinedRoutes
            ) : null
        );
    }
    /**
     * @access private
     */
    makeContentPanelCreateVisitor(state) {
        const uniqueImpls = {};
        const uniqueHighlighSelectors = {};
        return (PanelCls, panelCfg, isAdminPanel) => {
            const implName = panelCfg.impl;
            if (!uniqueImpls.hasOwnProperty(implName)) {
                uniqueImpls[implName] = 1;
                if (typeof PanelCls.getRoutes === 'function' && state.userDefinedRoutes) {
                    const routes = PanelCls.getRoutes();
                    if (routes) state.userDefinedRoutes.push(...routes);
                }
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
     * @param {{panelCfg: FrontendPanelConfig; siteInfo: SiteInfo; siteIframeDoc: HTMLDocument;}} props
     */
    constructor(props) {
        super(props);
        this.Renderer = props.panelCfg.UiImplClass;
        this.dataFromBackend = props.panelCfg.dataFromBackend;
        this.className = `ui-panel ui-panel-${this.dataFromBackend.impl}`;
        this.state = {title: '', icon: '', collapsed: false};
        this.toggleHighlight = makeHighlightToggler(this.dataFromBackend.highlightSelector,
                                                    this.dataFromBackend.selectorIndex,
                                                    props.siteIframeDoc);
    }
    /**
     * @access protected
     */
    render() {
        const isMobile = false;
        return $el('div', {className: this.className},
            $el('h3', null,
                $el('span', !isMobile ? {onMouseOver: this.toggleHighlight,
                                         onMouseOut: this.toggleHighlight}
                                      : {onClick: this.toggleHighlight},
                    this.state.icon && $el(FeatherSvg, {iconId: this.state.icon || 'feather'}),
                    this.state.title
                ),
                // $el('button', {onClick: () => this.setState({collapsed: !this.state.collapsed})},
                //     '[' + (!this.state.collapsed ? '-' : '+') + ']'
                // )
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

ControlPanelApp.AdminTabSection = props => $el('div', null,
    $el('h3', null,
        $el(FeatherSvg, {iconId: props.icon}),
        $el('span', null, props.title)
    ),
    $el('div', null,
        props.children
    ),
);

ControlPanelApp.PluginAdminTabSection = class extends preact.Component {
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
 * @param {HTMLDocument} siteIframeDoc
 * @return {Function} togglerFn
 */
function makeHighlightToggler(selector, selectorIndex, siteIframeDoc) {
    const makeOverlay = el => {
        const out = siteIframeDoc.createElement('div');
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
            node = siteIframeDoc.querySelectorAll(selector)[selectorIndex];
            if (!node) return;
            cache[selector] = node;
        }
        let over = siteIframeDoc.getElementById('rad-highlight-overlay');
        if (!over) {
            over = makeOverlay(node);
            siteIframeDoc.body.appendChild(over);
        } else {
            over.parentElement.removeChild(over);
        }
    };
}


export default ControlPanelApp;
