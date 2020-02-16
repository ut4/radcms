import {config, urlUtils, http, FeatherSvg} from '@rad-commons';
import {uiPanelRegister} from '@rad-cpanel-commons';

class ControlPanel extends preact.Component {
    /**
     * @param {dataFromBackend: ControlPanelAppProps || {}; onUpdate: () => any;} props
     */
    constructor(props) {
        super(props);
        this.siteInfo = null;
        this.siteIframe = null;
        this.navBarScroller = null;
        this.state = this.makeState(props.dataFromBackend);
        if (this.state.collapsed) props.onIsCollapsedToggled();
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
        const newState = {contentPanels: [],
                          adminPanels: [],
                          collapsed: !this.state ? this.getIsCollapsed() : this.state.collapsed,
                          userRole: undefined,
                          userPermissions: {}};
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
                config.baseUrl = dataFromBackend.baseUrl;
                config.assetBaseUrl = dataFromBackend.assetBaseUrl;
                config.userPermissions = dataFromBackend.userPermissions;
                this.siteInfo = {baseUrl: dataFromBackend.baseUrl,
                                 assetBaseUrl: dataFromBackend.assetBaseUrl,
                                 currentPagePath: dataFromBackend.currentPagePath};
                this.siteIframe = document.getElementById('rad-site-iframe');
                newState.adminPanels = [];
                newState.userDefinedRoutes = [];
                dataFromBackend.adminPanels.forEach(c => {
                    makePanel(c, newState.adminPanels, true);
                });
                newState.routesUpdated = true;
                newState.userRole = dataFromBackend.user.role;
                newState.userPermissions = dataFromBackend.userPermissions;
            }
            //
            dataFromBackend.contentPanels.forEach(p => {
                if (!Array.isArray(p.contentNodes)) p.contentNodes = [p.contentNodes];
                if (!p.contentNodes[0]) p.contentNodes = [];
                makePanel(p, newState.contentPanels, false);
            });
        }
        if (newState.routesUpdated && (!this.state || !this.state.routesUpdated))
            this.props.onRoutesLoaded(newState.userDefinedRoutes);
        return newState;
    }
    /**
     * @access protected
     */
    render() {
        return <div id="cpanel" ref={ el => { if (el && !this.navBarScroller && this.siteIframe) {
                                        makeNavBarScroller(el, this.siteIframe);
                                        this.navBarScroller = 1;
                                    } } }>
            <header class="top-row">
                <button onClick={ () => this.toggleIsCollapsed() } class="icon-button">
                    <FeatherSvg iconId={ `chevron-${!this.state.collapsed?'left':'right'}` }/>
                </button>
                <div id="logo">RAD<span>Cms</span></div>
            </header>
            <ControlPanel.QuickLinksSection
                userCanCreateContent={ this.state.userPermissions.canCreateContent }/>
            <ControlPanel.OnThisPageSection
                contentPanels={ this.state.contentPanels }
                siteIframe={ this.siteIframe }
                siteInfo={ this.siteInfo }/>
            <ControlPanel.AdminAndUserSection
                adminPanels={ this.state.adminPanels }
                siteInfo={ this.siteInfo }/>
            <ControlPanel.ForDevsSectionction
                userRole={ this.state.userRole }/>
        </div>;
    }
    /**
     * @access private
     */
    makeContentPanelCreateVisitor(state) {
        const uniqueImpls = {};
        const uniqueHighlighSelectors = {};
        return (PanelCls, panelCfg, isAdminPanel) => {
            const implName = panelCfg.impl;
            if (!uniqueImpls[implName]) {
                uniqueImpls[implName] = 1;
                if (typeof PanelCls.getRoutes === 'function' && state.userDefinedRoutes) {
                    const routes = PanelCls.getRoutes();
                    if (routes) state.userDefinedRoutes = state.userDefinedRoutes.concat(routes);
                }
            }
            if (!isAdminPanel && panelCfg.highlightSelector) {
                const s = panelCfg.highlightSelector;
                if (uniqueHighlighSelectors[s] === undefined)
                    uniqueHighlighSelectors[s] = -1;
                panelCfg.selectorIndex = ++uniqueHighlighSelectors[s];
            }
        };
    }
    /**
     * @access private
     */
    toggleIsCollapsed() {
        const collapsed = !this.state.collapsed;
        this.setState({collapsed});
        localStorage.radNavIsCollapsed = collapsed;
        this.props.onIsCollapsedToggled();
    }
    /**
     * @access private
     */
    getIsCollapsed() {
        const val = localStorage.radNavIsCollapsed || 'false';
        return val === 'true';
    }
}

ControlPanel.QuickLinksSection = class extends preact.Component {
    /**
     * @param {{userCanCreateContent?: bool}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        if (!this.props.userCanCreateContent) return null;
        return <section class="quick-links"><div>
            <h2>Pikalinkit</h2>
            <button onClick={ () => { urlUtils.redirect('/add-content'); } }
                    class="icon-button">
                <FeatherSvg iconId="edit-2"/>
                <span>Luo sisältöä</span>
            </button>
        </div></section>;
    }
};

ControlPanel.OnThisPageSection = class extends preact.Component {
    /**
     * @param {{contentPanels: Array<>; siteIframe: HTMLIFrameElement|null; siteInfo: Object;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        if (!this.props.siteIframe) return null;
        return <section class="on-this-page"><div>
            <h2>Tällä sivulla</h2>
            { this.props.contentPanels.length
                ? this.props.contentPanels.map((panelCfg, i) =>
                    <ControlPanel.ContentPanel
                        Renderer={ panelCfg.UiImplClass }
                        rendererProps={ {dataFromBackend: panelCfg.dataFromBackend,
                                         siteInfo: this.props.siteInfo} }
                        siteIframe={ this.props.siteIframe }
                        key={ `${panelCfg.dataFromBackend.title}-${i}` }/>
                )
                : this.props.siteIframe ? 'Ei muokattavaa sisältöä tällä sivulla' : null }
        </div></section>;
    }
};

ControlPanel.AdminAndUserSection = class extends preact.Component {
    /**
     * @param {{adminPanels: Array<>; siteInfo: Object;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <section class="site-admin"><div>
            <h2>Hallinta</h2>
            { this.props.adminPanels.map((panelCfg, i) =>
                <ControlPanel.AdminPanel
                    key={ `plugin-panel-${i}` }
                    Renderer={ panelCfg.UiImplClass }
                    rendererProps={ {dataFromBackend: panelCfg.dataFromBackend,
                                     siteInfo: this.props.siteInfo} }
                    isPlugin={ true }/>
            ).concat(
                <ControlPanel.AdminPanel Renderer={ null } title="Käyttäjä" icon="user" mainUrl="/me">
                    <a href="#/me">Profiili</a>
                    <a href={ urlUtils.makeUrl('/logout') }
                    onClick={ e => this.logout(e) }>Kirjaudu ulos</a>
                </ControlPanel.AdminPanel>
            ) }
        </div></section>;
    }
    /**
     * @access private
     */
    logout(e) {
        e.preventDefault();
        http.post('/api/logout')
            .then(() => {
                window.location.href = urlUtils.makeUrl('/login?from-logout');
            })
            .catch(() => {
                toast('Uloskirjautuminen epäonnistui', 'error');
            });
    }
};

ControlPanel.ForDevsSectionction = class extends preact.Component {
    /**
     * @param {{userRole: number;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        if (this.props.userRole !== 0) return null;
        return <section class="for-devs"><div>
            <h2>Devaajalle</h2>
            <ControlPanel.AdminPanel Renderer={ null } title="Kaikki sisältö" icon="database" mainUrl="/manage-content">
                <a href="#/manage-content">Selaa</a>
                <a href="#/add-content">Luo</a>
            </ControlPanel.AdminPanel>
            <ControlPanel.AdminPanel Renderer={ null } title="Lisäosat" icon="box" mainUrl="/manage-plugins">
                <a href="#/manage-plugins">Selaa</a>
            </ControlPanel.AdminPanel>
            <ControlPanel.AdminPanel Renderer={ null } title="Sivusto" icon="tool" mainUrl="/pack-website">
                <a href="#/pack-website">Paketoi</a>
            </ControlPanel.AdminPanel>
        </div></section>;
    }
};

ControlPanel.AdminPanel = class extends preact.Component {
    /**
     * @param {{Renderer: any; rendererProps?: any; title?: string; icon?: string; mainUrl?: string;}} props
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
                        mainUrl: cmp.getMainUrl ? urlUtils.normalizeUrl(cmp.getMainUrl()) : null
                    });
                }});
        }
        this.state = {title: props.title || '',
                      icon: props.icon || '',
                      mainUrl: !props.mainUrl ? '' : urlUtils.normalizeUrl(props.mainUrl),
                      highlight: false};
    }
    /**
     * @access protected
     */
    render() {
        return <div class="section-row">
            <div>
                <a href={ `#/${this.state.mainUrl}` }>{ [
                    this.state.icon ? <FeatherSvg iconId={ this.state.icon }/> : null,
                    this.state.title,
                    !this.props.isPlugin !== false ? null : <i>Lisäosa</i>,
                ] }</a>
            { this.state.highlight
                ? <button onClick={ () => this.state.highlight() } class="icon-button">
                    <FeatherSvg iconId="target"/></button>
                : null }
            </div>
            <div class="sub-nav"><div>
                <h3>{ this.state.title }</h3>
                {
                    this.Renderer
                        ? preact.createElement(this.Renderer, this.rendererProps)
                        : this.props.children
                }
            </div></div>
        </div>;
    }
};

ControlPanel.ContentPanel = class extends ControlPanel.AdminPanel {
    /**
     * @access protected
     * @override
     */
    componentWillMount() {
        const {dataFromBackend} = this.props.rendererProps;
        this.setState({highlight: makeHighlightToggler(dataFromBackend.highlightSelector,
                                                       dataFromBackend.selectorIndex,
                                                       this.props.siteIframe)});
    }
};

/**
 * @param {string} selector
 * @param {number} selectorIndex
 * @param {HTMLIFrameElement} siteIframe
 * @return {Function|null} togglerFn tail null jos $selector ei mätchännyt
 */
function makeHighlightToggler(selector, selectorIndex, siteIframe) {
    const siteIframeWin = siteIframe.contentWindow;
    const siteIframeDoc = siteIframe.contentDocument;
    const makeOverlay = el => {
        const out = siteIframe.contentDocument.createElement('div');
        out.id = 'rad-highlight-overlay';
        const r = el.getBoundingClientRect();
        out.style = 'width:' + r.width + 'px' +
                  ';height:' + r.height + 'px' +
                  ';top:' + (r.top + siteIframeWin.scrollY) + 'px' +
                  ';left:' + (r.left + siteIframeWin.scrollX) + 'px';
        return out;
    };
    const el = selector
        ? siteIframeDoc.querySelectorAll(selector)[selectorIndex]
        : null;
    if (el) {
        let timeout = null;
        const elTop = el.getBoundingClientRect().top - 20;
        const top = elTop >= 0 ? elTop : 0;
        return () => {
            clearTimeout(timeout);
            let overlay = siteIframeDoc.getElementById('rad-highlight-overlay');
            if (!overlay) {
                overlay = makeOverlay(el);
                siteIframeDoc.body.appendChild(overlay);
                siteIframeWin.scroll({top});
            }
            timeout = setTimeout(() => {
                overlay.parentElement.removeChild(overlay);
            }, 1000);
        };
    }
    return null;
}

/**
 * @param {HTMLElement} cpanelNavEl
 * @param {HTMLIFrameElement} siteIframe
 */
function makeNavBarScroller(cpanelNavEl, siteIframe) {
    let navHeight = 0;
    let windowIsSmallEnough = false;
    //
    const handleWinResize = () => {
        const newVal = window.innerHeight < navHeight;
        if (!newVal && windowIsSmallEnough)
            cpanelNavEl.style.transform = '';
        windowIsSmallEnough = newVal;
    };
    const handleScroll = () => {
        if (windowIsSmallEnough)
            cpanelNavEl.style.transform = `translateY(-${siteIframe.contentWindow.scrollY}px)`;
    };
    window.addEventListener('resize', handleWinResize, true);
    siteIframe.contentDocument.addEventListener('scroll', handleScroll, true);
    //
    setTimeout(() => {
        navHeight = Array.from(cpanelNavEl.children).reduce((c, el) =>
            c + el.getBoundingClientRect().height
        , 0);
        if (navHeight) {
            handleWinResize();
            handleScroll();
        }
    }, 20);
}

export default ControlPanel;
