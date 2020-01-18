import {config, urlUtils, FeatherSvg, Toaster} from '@rad-commons';
import {uiPanelRegister} from '@rad-cpanel-commons';
import ContentAddView from './Content/ContentAddView.jsx';
import ContentManageView from './Content/ContentManageView.jsx';
import ContentEditView from './Content/ContentEditView.jsx';
import PluginsManageView from './Plugin/PluginsManageView.jsx';
import WebsitePackView from './Website/WebsitePackView.jsx';
const PreactRouter = preactRouter;

class ControlPanelApp extends preact.Component {
    /**
     * @param {dataFromBackend: ControlPanelAppProps || {};} props
     */
    constructor(props) {
        super(props);
        this.siteInfo = null;
        this.siteIframe = null;
        this.navBarScroller = null;
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
                config.baseUrl = dataFromBackend.baseUrl;
                config.assetBaseUrl = dataFromBackend.assetBaseUrl;
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
        return <div>
            <Toaster/>
            <div id="cpanel" ref={ el => { if (el && !this.navBarScroller) {
                                    makeNavBarScroller(el, this.siteIframe);
                                    this.navBarScroller = 1;
                                } } }>
                <div class="top-row">
                    <button class="icon-button">
                        <FeatherSvg iconId="arrow-left"/>
                    </button>
                    <div id="logo">RAD<span>Cms</span></div>
                </div>
                <section class="quick-links"><div>
                    <h2>Pikalinkit</h2>
                    <button onClick={ () => { urlUtils.redirect('/add-content'); } }
                            class="icon-button">
                        <FeatherSvg iconId="edit-2"/>
                        <span>Luo sisältöä</span>
                    </button>
                </div></section>
                <section><div>
                    <h2>Tällä sivulla</h2>{
                    this.state.contentPanels.length
                        ? this.state.contentPanels.map((panelCfg, i) =>
                            <ControlPanelApp.ContentPanel
                                Renderer={ panelCfg.UiImplClass }
                                rendererProps={ {dataFromBackend: panelCfg.dataFromBackend,
                                                 siteInfo: this.siteInfo} }
                                siteIframe={ this.siteIframe }
                                key={ `${panelCfg.dataFromBackend.title}-${i}` }/>
                        )
                        : this.state.routesUpdated ? 'Ei muokattavaa sisältöä tällä sivulla' : null
                }</div></section>
                <section><div>
                    <h2>Devaajalle</h2>{
                    this.state.adminPanels.map(panelCfg =>
                        <ControlPanelApp.AdminPanel
                            Renderer={ panelCfg.UiImplClass }
                            rendererProps={ {dataFromBackend: panelCfg.dataFromBackend,
                                             siteInfo: this.siteInfo} }
                            isPlugin={ true }/>
                    ).concat(
                        <ControlPanelApp.AdminPanel Renderer={ null } title="Kaikki sisältö" icon="database">
                            <a href="#/manage-content">Selaa</a>
                            <a href="#/add-content">Luo</a>
                        </ControlPanelApp.AdminPanel>,
                        <ControlPanelApp.AdminPanel Renderer={ null } title="Lisäosat" icon="box">
                            <a href="#/manage-plugins">Selaa</a>
                        </ControlPanelApp.AdminPanel>,
                        <ControlPanelApp.AdminPanel Renderer={ null } title="Sivusto" icon="tool">
                            <a href="#/pack-website">Paketoi</a>
                        </ControlPanelApp.AdminPanel>
                    )
                }</div></section>
            </div>
            { this.state.routesUpdated ? <PreactRouter history={ History.createHashHistory() }>
                <ContentAddView path="/add-content/:initialContentTypeName?"/>
                <ContentManageView path="/manage-content"/>
                <ContentEditView path="/edit-content/:id/:contentTypeName/:publish?"/>
                <PluginsManageView path="/manage-plugins"/>
                <WebsitePackView path="/pack-website"/>
                { this.state.userDefinedRoutes }
            </PreactRouter> : null }
            <ControlPanelApp.PopupDialog/>
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
            ? preact.createElement(this.state.Renderer, this.rendererProps)
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
                      highlighter: false};
    }
    /**
     * @access protected
     */
    render() {
        return <div class="ui-panel">
            <h3>
                <span>{ [
                    this.state.icon ? <FeatherSvg iconId={ this.state.icon }/> : null,
                    this.state.title,
                    !this.props.isPlugin !== false ? null : <i>Lisäosa</i>
                ] }</span>
                { this.state.highlighter
                    ? <button onClick={ () => this.state.highlighter() } class="icon-button">
                        <FeatherSvg iconId="target"/></button>
                    : null }
            </h3>
            <div class="sub-nav"><div>{
                this.Renderer
                    ? preact.createElement(this.Renderer, this.rendererProps)
                    : this.props.children
            }</div></div>
        </div>;
    }
};

ControlPanelApp.ContentPanel = class extends ControlPanelApp.AdminPanel {
    /**
     * @access protected
     * @override
     */
    componentWillMount() {
        const {dataFromBackend} = this.props.rendererProps;
        this.setState({highlighter: makeHighlightToggler(dataFromBackend.highlightSelector,
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

export default ControlPanelApp;
