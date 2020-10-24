import {http, toasters, urlUtils, FeatherSvg} from '@rad-commons';
import {contentPanelRegister} from '@rad-cpanel-commons';
import {genRandomString} from './Website/WebsitePackView.jsx';
import webPageState from './webPageState.js';
const UserRole = Object.freeze({SUPER_ADMIN: 1});

class ControlPanel extends preact.Component {
    /**
     * @param {{adminPanelBundles: Array<{ImplClass: any; panel: FrontendPanelConfig; id?: string;}>; dataFromAdminBackend: ControlPanelLoadArgs; onIsCollapsedToggled: () => any;}} props
     */
    constructor(props) {
        super(props);
        this.dataFromAdminBackend = props.dataFromAdminBackend;
        this.siteIframe = document.getElementById('rad-site-iframe');
        this.siteInfo = {baseUrl: props.dataFromAdminBackend.baseUrl,
                         assetBaseUrl: props.dataFromAdminBackend.assetBaseUrl};
        this.state = {contentPanels: [],
                      collapsed: localStorage.radNavIsCollapsed === 'true',
                      websiteIframeHasLoadedAtLeastOnce: false};
        if (this.state.collapsed)
            props.onIsCollapsedToggled();
    }
    /**
     * @param {FrontendPanelConfig} panel
     * @param {string=} id
     * @returns {{ImplClass: any; panel: FrontendPanelConfig; id?: string;}}
     */
    static makePanelBundle(panel, id) {
        const Cls = contentPanelRegister.getImpl(panel.impl);
        if (!Cls) return window.console.error(`UI panel ${panel.impl} not implemented.`);
        return {ImplClass: Cls, panel, id};
    }
    /**
     * @param {PageLoadArgs} dataFromWebpageIframe
     * @access public
     */
    handleWebpageLoaded(dataFromWebpageIframe) {
        webPageState.update(dataFromWebpageIframe);
        const newState = {contentPanels: [], websiteIframeHasLoadedAtLeastOnce: true};
        const uniqueHighlighSelectors = {};
        newState.contentPanels = dataFromWebpageIframe.contentPanels.map(p => {
            if (p.highlightSelector) {
                const s = p.highlightSelector;
                if (uniqueHighlighSelectors[s] === undefined)
                    uniqueHighlighSelectors[s] = -1;
                p.selectorIndex = ++uniqueHighlighSelectors[s];
            }
            return ControlPanel.makePanelBundle(p, genRandomString(16));
        });
        this.setState(newState);
        if (newState.contentPanels.length)
            this.props.onContentPanelsLoaded(newState.contentPanels);
    }
    /**
     * @access protected
     */
    render() {
        return <div id="cpanel2">
            <header class="container">
                <a href={ urlUtils.makeUrl('/_edit') }>
                    <img src={ urlUtils.makeAssetUrl('frontend/rad/assets/rad-logo-light.png') }/>
                </a>
            </header>
            <OnThisPageControlPanelSection
                contentPanels={ this.state.contentPanels }
                siteIframe={ this.siteIframe }
                siteInfo={ this.siteInfo }
                websiteIframeHasLoadedAtLeastOnce={ this.state.websiteIframeHasLoadedAtLeastOnce }/>
            <AdminAndUserControlPanelSection
                adminPanels={ this.props.adminPanelBundles }
                siteInfo={ this.siteInfo }/>
            <ForDevsControlPanelSectionction
                userRole={ this.dataFromAdminBackend.user.role }/>
            <footer>&nbsp;</footer>
        </div>;
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
}

class OnThisPageControlPanelSection extends preact.Component {
    /**
     * @param {{contentPanels: Array<{ImplClass: Object; panel: Object; id: string;}>; siteIframe: HTMLIFrameElement|null; siteInfo: Object; websiteIframeHasLoadedAtLeastOnce: boolean;}} props
     * @access protected
     */
    render({contentPanels, siteIframe, siteInfo, websiteIframeHasLoadedAtLeastOnce}) {
        if (!websiteIframeHasLoadedAtLeastOnce) return null;
        return <section>
            <h2>Tällä sivulla</h2>
            { contentPanels.length
                ? contentPanels.map(panelBundle =>
                    <ContentControlPanelPanel
                        Renderer={ panelBundle.ImplClass }
                        rendererProps={ {settings: panelBundle.panel.implProps,
                                         panel: panelBundle.panel,
                                         siteInfo: siteInfo} }
                        siteIframe={ siteIframe }
                        key={ panelBundle.id }/>
                )
                : websiteIframeHasLoadedAtLeastOnce
                    ? <p class="entry" style="font-size: .7rem;">Ei muokattavaa sisältöä tällä sivulla.</p>
                    : null
            }
        </section>;
    }
}

class AdminAndUserControlPanelSection extends preact.Component {
    /**
     * @param {{adminPanels: Array<{ImplClass: any; panel: FrontendPanelConfig; id?: string;}>; siteInfo: Object;}} props
     * @access protected
     */
    render({adminPanels, siteInfo}) {
        return <section class="site-admin"><div>
            <h2>Hallinta</h2>
            { adminPanels.map((panelBundle, i) =>
                <AdminControlPanelPanel
                    key={ `admin-panel-${i}` }
                    Renderer={ panelBundle.ImplClass }
                    rendererProps={ {settings: panelBundle.panel.implProps,
                                     panel: panelBundle.panel,
                                     siteInfo: siteInfo} }
                    isPlugin={ true }/>
            ).concat(
                <AdminControlPanelPanel Renderer={ null } title="Lataukset" mainUrl="/manage-uploads">
                    <a href="#manage-uploads">Hallitse</a>
                    <a href="#rescan-uploads">Skannaa</a>
                </AdminControlPanelPanel>,
                <AdminControlPanelPanel Renderer={ null } title="Sivusto" mainUrl="/edit-website-info">
                    <a href="#edit-website-info">Muokkaa tietoja</a>
                    <a href="#self-update">Päivitä</a>
                </AdminControlPanelPanel>,
                <AdminControlPanelPanel Renderer={ null } title="Käyttäjä" mainUrl="/me">
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
     * @access protected
     */
    render({userRole}) {
        if (userRole !== UserRole.SUPER_ADMIN) return null;
        return <section class="for-devs"><div>
            <h2>Devaajille</h2>
            <AdminControlPanelPanel Renderer={ null } title="Kaikki sisältö"
                                    mainUrl="/manage-content">
                <a href="#/manage-content">Selaa</a>
                <a href="#/add-content">Luo</a>
            </AdminControlPanelPanel>
            <AdminControlPanelPanel Renderer={ null } title="Sisältötyypit"
                                    mainUrl="/manage-content-types">
                <a href="#/manage-content-types">Selaa</a>
                <a href="#/manage-content-types?auto-open-create-form">Luo uusi</a>
            </AdminControlPanelPanel>
            <AdminControlPanelPanel Renderer={ null } title="Lisäosat"
                                    mainUrl="/manage-plugins">
                <a href="#/manage-plugins">Selaa</a>
            </AdminControlPanelPanel>
            <AdminControlPanelPanel Renderer={ null } title="Sivusto"
                                    mainUrl="/pack-website">
                <a href="#/pack-website">Paketoi</a>
            </AdminControlPanelPanel>
        </div></section>;
    }
}

class AdminControlPanelPanel extends preact.Component {
    /**
     * @param {{Renderer: any; rendererProps?: any; title?: string; mainUrl?: string;}} props
     */
    constructor(props) {
        super(props);
        this.Renderer = null;
        this.rendererProps = null;
        if (props.Renderer) {
            this.Renderer = props.Renderer;
            this.rendererProps = Object.assign({}, props.rendererProps || {},
                {ref: cmp => {
                    if (cmp && !this.state.title.length) {
                        const title = cmp.getTitle();
                        this.setState({
                            title: !Array.isArray(title) ? [title] : title,
                            mainUrl: cmp.getMainUrl ? urlUtils.normalizeUrl(cmp.getMainUrl()) : null,
                            isCollapsed: !cmp.getSettings || cmp.getSettings().isInitiallyCollapsed !== false,
                        });
                    }
                }});
        }
        this.state = {title: props.title ? [props.title] : [],
                      mainUrl: !props.mainUrl ? '' : urlUtils.normalizeUrl(props.mainUrl),
                      highlight: null,
                      isCollapsed: true};
    }
    /**
     * @access protected
     */
    render({isPlugin, children}) {
        const title = this.state.title[0];
        const subtitle = this.state.title[1] || (!isPlugin ? null : '(Lisäosa)');
        return <div class="entry container">
            <a class="columns col-centered" href={ `#/${this.state.mainUrl}` }>
                <span class="column text-ellipsis">{ [
                    title,
                    !subtitle ? null : <i class="subtitle color-alt-light">{ subtitle }</i>
                ] }</span>
                { !this.state.highlight
                    ? null
                    : <button onClick={ e => this.state.highlight(e) } class="btn btn-icon column col-auto locate color-alt-light"><FeatherSvg iconId="target" className="feather-sm"/></button>
                }
                <button onClick={ e => this.showOrHideSubNav(e) } class="btn btn-icon toggle color-alt-light">
                    <FeatherSvg iconId={ `chevron-${this.state.isCollapsed ? 'down' : 'up'}` }
                                className="feather-sm"/>
                </button>
            </a>
            <div class={ `sub-nav${this.state.isCollapsed ? '' : ' visible'}` }>{
                this.Renderer
                    ? preact.createElement(this.Renderer, this.rendererProps)
                    : children
            }</div>
        </div>;
    }
    /**
     * @access private
     */
    showOrHideSubNav(e) {
        e.preventDefault();
        this.setState({isCollapsed: !this.state.isCollapsed});
    }
}

class ContentControlPanelPanel extends AdminControlPanelPanel {
    /**
     * @access protected
     * @override
     */
    componentWillMount() {
        const {panel} = this.props.rendererProps;
        this.setState({highlight: makeHighlightToggler(panel.highlightSelector,
                                                       panel.selectorIndex,
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
    if (!el) return null;
    let timeout = null;
    const elTop = el.getBoundingClientRect().top - 20;
    const top = elTop >= 0 ? elTop : 0;
    return e => {
        e.preventDefault();
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

export default ControlPanel;
