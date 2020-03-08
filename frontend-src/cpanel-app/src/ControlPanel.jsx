import {config, http, toasters, urlUtils, FeatherSvg} from '@rad-commons';
import {uiPanelRegister} from '@rad-cpanel-commons';

class ControlPanel extends preact.Component {
    /**
     * @param {dataFromBackend: ControlPanelAppProps || {}; onUpdate: () => any;} props
     */
    constructor(props) {
        super(props);
        this.siteInfo = null;
        this.siteIframe = null;
        this.cpanelScroller = null;
        this.state = this.makeState(props.dataFromBackend);
        if (this.state.collapsed) props.onIsCollapsedToggled();
    }
    /**
     * @param {ControlPanelAppProps} dataFromBackend
     * @access public
     */
    setup(dataFromBackend) {
        this.setState(this.makeState(dataFromBackend));
        if (this.cpanelScroller)
            this.cpanelScroller.updateMinHeight();
    }
    /**
     * @access private
     */
    makeState(dataFromBackend) {
        const newState = {contentPanels: [],
                          adminPanels: !this.state ? [] : this.state.adminPanels,
                          collapsed: !this.state ? this.getIsCollapsed() : this.state.collapsed};
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
        return <div id="cpanel" ref={ el => { if (el && !this.cpanelScroller && this.siteIframe) {
                                        this.cpanelScroller = makeCpanelScroller(el, this.siteIframe);
                                    } } }>
            <header class="top-row">
                <button onClick={ () => this.toggleIsCollapsed() } class="icon-button">
                    <FeatherSvg iconId={ `chevron-${!this.state.collapsed?'left':'right'}` }/>
                </button>
                <a id="logo" href="#/">RAD<span>CMS</span></a>
            </header>
            <QuickLinksControlPanelSection
                userCanCreateContent={ (this.state.userPermissions || {}).canCreateContent }/>
            <OnThisPageControlPanelSection
                contentPanels={ this.state.contentPanels }
                siteIframe={ this.siteIframe }
                siteInfo={ this.siteInfo }/>
            <AdminAndUserControlPanelSection
                adminPanels={ this.state.adminPanels }
                siteInfo={ this.siteInfo }/>
            <ForDevsControlPanelSectionction
                userRole={ this.state.userRole }/>
            <footer>&nbsp;</footer>
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
        this.cpanelScroller.updateMinHeight();
    }
    /**
     * @access private
     */
    getIsCollapsed() {
        const val = localStorage.radNavIsCollapsed || 'false';
        return val === 'true';
    }
}

class QuickLinksControlPanelSection extends preact.Component {
    /**
     * @param {{userCanCreateContent?: boolean}} props
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
}

class OnThisPageControlPanelSection extends preact.Component {
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
                    <ContentControlPanelPanel
                        Renderer={ panelCfg.UiImplClass }
                        rendererProps={ {dataFromBackend: panelCfg.dataFromBackend,
                                         siteInfo: this.props.siteInfo} }
                        siteIframe={ this.props.siteIframe }
                        key={ `${panelCfg.dataFromBackend.title}-${i}` }/>
                )
                : this.props.siteIframe ? 'Ei muokattavaa sisältöä tällä sivulla' : null }
        </div></section>;
    }
}

class AdminAndUserControlPanelSection extends preact.Component {
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
                <AdminControlPanelPanel
                    key={ `plugin-panel-${i}` }
                    Renderer={ panelCfg.UiImplClass }
                    rendererProps={ {dataFromBackend: panelCfg.dataFromBackend,
                                     siteInfo: this.props.siteInfo} }
                    isPlugin={ true }/>
            ).concat(
                <AdminControlPanelPanel Renderer={ null } title="Käyttäjä" icon="user" mainUrl="/me">
                    <a href="#/me">Profiili</a>
                    <a href={ urlUtils.makeUrl('/logout') }
                    onClick={ e => this.logout(e) }>Kirjaudu ulos</a>
                </AdminControlPanelPanel>
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
                toasters.main('Uloskirjautuminen epäonnistui', 'error');
            });
    }
}

class ForDevsControlPanelSectionction extends preact.Component {
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
            <AdminControlPanelPanel Renderer={ null } title="Kaikki sisältö" icon="database" mainUrl="/manage-content">
                <a href="#/manage-content">Selaa</a>
                <a href="#/add-content">Luo</a>
            </AdminControlPanelPanel>
            <AdminControlPanelPanel Renderer={ null } title="Sisältötyypit" icon="type" mainUrl="/manage-content-types">
                <a href="#/manage-content-types">Selaa</a>
            </AdminControlPanelPanel>
            <AdminControlPanelPanel Renderer={ null } title="Lisäosat" icon="box" mainUrl="/manage-plugins">
                <a href="#/manage-plugins">Selaa</a>
            </AdminControlPanelPanel>
            <AdminControlPanelPanel Renderer={ null } title="Sivusto" icon="tool" mainUrl="/pack-website">
                <a href="#/pack-website">Paketoi</a>
            </AdminControlPanelPanel>
        </div></section>;
    }
}

class AdminControlPanelPanel extends preact.Component {
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
}

class ContentControlPanelPanel extends AdminControlPanelPanel {
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
}

/**
 * @param {string} selector
 * @param {number} selectorIndex
 * @param {HTMLIFrameElement} siteIframe
 * @returns {Function|null} togglerFn tail null jos $selector ei mätchännyt
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
 * @param {HTMLElement} cpanelEl
 * @param {HTMLIFrameElement} siteIframe
 */
function makeCpanelScroller(cpanelEl, siteIframe) {
    let cpanelHeight = 0;
    let cpanelIsTallerThanWindow = false;
    let totalScroll = 0;
    let totalScrollLast = 0;
    let cpanelScroll = 0;
    let currentSiteIframe = null;
    //
    const updateMinHeight = () => {
        setTimeout(() => {
            cpanelHeight = cpanelEl.querySelector('footer').getBoundingClientRect().top;
            if (cpanelHeight) {
                cpanelIsTallerThanWindow = cpanelHeight > window.innerHeight;
                if (cpanelIsTallerThanWindow)
                    siteIframe.contentDocument.body.style.minHeight = `${cpanelHeight+20}px`;
                if (siteIframe !== currentSiteIframe) {
                    siteIframe.contentDocument.addEventListener('scroll', handleScroll, true);
                    currentSiteIframe = siteIframe;
                }
                handleScroll();
            }
        }, 20);
    };
    const handleScroll = () => {
        if (cpanelIsTallerThanWindow) {
            const delta = siteIframe.contentWindow.scrollY - totalScrollLast;
            totalScroll += delta;
            totalScrollLast = totalScroll;
            //
            cpanelScroll += delta;
            const translateMax = cpanelHeight - window.innerHeight;
            if (cpanelScroll <= 0) cpanelScroll = 0;
            else if (cpanelScroll > translateMax) cpanelScroll = translateMax;
            cpanelEl.style.transform = `translateY(-${cpanelScroll}px)`;
        }
    };
    //
    window.addEventListener('resize', () => {
        const newIsTaller = cpanelHeight > window.innerHeight;
        if (!newIsTaller && cpanelIsTallerThanWindow)
            cpanelEl.style.transform = '';
        cpanelIsTallerThanWindow = newIsTaller;
    }, true);
    updateMinHeight();
    //
    return {updateMinHeight};
}

export default ControlPanel;
