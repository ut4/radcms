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
        this.siteIframe = null;
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
        if (dataFromBackend.baseUrl) {
            const onEachMakePanel = this.makeContentPanelCreateVisitor(newState);
            const makePanel = (dataFromBackend, to, isAdminPanel) => {
                const Cls = uiPanelRegister.getUiPanelImpl(dataFromBackend.impl);
                if (!Cls) return window.console.error(`UI panel ${dataFromBackend.impl} not implemented.`);
                to.push({UiImplClass: Cls, dataFromBackend});
                onEachMakePanel(Cls, dataFromBackend, isAdminPanel);
            };
            //
            if (!this.siteInfo) {
                services.config.baseUrl = dataFromBackend.baseUrl;
                services.config.assetBaseUrl = dataFromBackend.assetBaseUrl;
                this.siteInfo = {baseUrl: dataFromBackend.baseUrl,
                                 assetBaseUrl: dataFromBackend.assetBaseUrl,
                                 currentPagePath: dataFromBackend.currentPagePath};
                this.siteIframe = document.getElementById('rad-site-iframe');
                //
                newState.adminPanels = [];
                newState.userDefinedRoutes = [];
                dataFromBackend.adminPanels.forEach(c => {
                    makePanel(c, newState.adminPanels, true);
                });
                newState.routesUpdated = true;
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
        if (!this.state.routesUpdated)
            return;
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
                    this.state.contentPanels.length
                        ? this.state.contentPanels.map((panelCfg, i) =>
                            $el(ControlPanelApp.ContentPanel,
                                {Renderer: panelCfg.UiImplClass,
                                 rendererProps: {dataFromBackend: panelCfg.dataFromBackend,
                                                 siteInfo: this.siteInfo},
                                 siteIframeDoc: this.siteIframe.contentDocument,
                                 key: `${panelCfg.dataFromBackend.title}-${i}`})
                        )
                        : this.state.routesUpdated ? 'Ei muokattavaa sisältöä tällä sivulla' : null
                )),
                $el('section', null, $el('div', null,
                    this.state.adminPanels.map(panelCfg =>
                        $el(ControlPanelApp.AdminPanel,
                            {Renderer: panelCfg.UiImplClass,
                             rendererProps: {dataFromBackend: panelCfg.dataFromBackend,
                                             siteInfo: this.siteInfo},
                             isPlugin: true},
                        )
                    ).concat(
                        $el(ControlPanelApp.AdminPanel,
                            {Renderer: null, title: 'Kaikki sisältö', icon: 'database'},
                            $el(MyLink, {to: '/manage-content'}, 'Selaa'),
                            $el(MyLink, {to: '/add-content'}, 'Luo')
                        ),
                        $el(ControlPanelApp.AdminPanel,
                            {Renderer: null, title: 'Lisäosat', icon: 'box'},
                            $el(MyLink, {to: '/manage-plugins'}, 'Selaa')
                        ),
                        $el(ControlPanelApp.AdminPanel,
                            {Renderer: null, title: 'Sivusto', icon: 'tool'},
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
            ) : null,
            $el(ControlPanelApp.PopupDialog)
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

ControlPanelApp.PopupDialog = class extends preact.Component {
    /**
     * @param {{publishApiTo?: any;}} props
     */
    constructor(props) {
        super(props);
        this.rendererProps = null;
        this.state = {Renderer: null};
        (props.publishApiTo || window).popupDialog = this;
    }
    /**
     * @param {any} Renderer
     * @param {any} rendererProps
     * @access public
     */
    open(Renderer, rendererProps) {
        this.rendererProps = rendererProps;
        this.setState({Renderer});
    }
    /**
     * @access public
     */
    close() {
        this.setState({Renderer: null});
    }
    /**
     * @access protected
     */
    render() {
        return this.state.Renderer
            ? $el(this.state.Renderer, this.rendererProps)
            : null;
    }
};

ControlPanelApp.AdminPanel = class extends preact.Component {
    /**
     * @param {{Renderer: any; rendererProps?: any;}} props
     */
    constructor(props) {
        super(props);
        this.Renderer = null;
        this.rendererProps = null;
        if (props.Renderer) {
            this.Renderer = props.Renderer;
            this.rendererProps = Object.assign({}, props.rendererProps || {},
                {ref: cmp => {
                    if (cmp && !this.state.title) this.setState({
                        title: cmp.getTitle() || '-',
                        icon: cmp.getIcon() || 'feather',
                    });
                }});
        }
        this.state = {title: props.title || '',
                      icon: props.icon || '',
                      collapsed: false};
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', {className: 'ui-panel'},
            $el('h3', null,
                $el('span', this.makeTitleProps(),
                    this.state.icon ? $el(FeatherSvg, {iconId: this.state.icon}) : null,
                    this.state.title,
                    !this.props.isPlugin !== false ? null : $el('i', null, 'Lisäosa')
                ),
                $el('button', {onClick: () => this.setState({collapsed: !this.state.collapsed}),
                               className: 'icon-button'},
                    $el(FeatherSvg, {iconId: `chevron-${!this.state.collapsed ? 'up' : 'down'}`})
                )
            ),
            $el('div', {className: !this.state.collapsed ? '' : 'hidden'},
                this.Renderer
                    ? $el(this.Renderer, this.rendererProps)
                    : this.props.children
            )
        );
    }
    /**
     * @access procted
     * @override
     */
    makeTitleProps() {
        return null;
    }
};

ControlPanelApp.ContentPanel = class extends ControlPanelApp.AdminPanel {
    /**
     * @access protected
     * @override
     */
    componentWillMount() {
        const {dataFromBackend} = this.props.rendererProps;
        this.toggleHighlight = makeHighlightToggler(dataFromBackend.highlightSelector,
                                                    dataFromBackend.selectorIndex,
                                                    this.props.siteIframeDoc);
    }
    /**
     * @access procted
     * @override
     */
    makeTitleProps() {
        const isMobile = false;
        return !isMobile
            ? {onMouseOver: this.toggleHighlight,
               onMouseOut: this.toggleHighlight}
            : {onClick: this.toggleHighlight};
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
