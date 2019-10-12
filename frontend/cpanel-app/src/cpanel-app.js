import services from '../../src/common-services.js';
import {myLink, contentNodeList, featherSvg, Toaster} from '../../src/common-components.js';
import {GenericUIPanelImpl, GenericListUIPanelImpl, StaticMenuUIPanelImpl} from './ui-panel-impls.js';
import {WebsiteGenerateView, WebsiteUploadView} from './website-views.js';
import {AddContentView, EditContentView} from './content-views.js';
import {ManageContentTypesView, CreateContentTypeView} from './content-type-views.js';
import {SiteGraphEditView} from './site-graph-views.js';

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
                myLink('/frontend/app.html', 'Back to dashboard', true),
                $el('div', {className: 'tab-links'},
                    $el('button', {
                        className: this.state.tabA ? 'current' : '',
                        onClick: () => { if (!this.state.tabA) this.setState({tabA: true}); }
                    }, 'Content'),
                    $el('button', {
                        className: !this.state.tabA ? 'current' : '',
                        onClick: () => { if (this.state.tabA) this.setState({tabA: false}); }
                    }, 'For devs')
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
                    $el(WebsiteGenerateView, {path: '/generate-website'}, null),
                    $el(WebsiteUploadView, {path: '/upload-website'}, null),
                    $el(SiteGraphEditView, {path: '/edit-site-graph'}, null),
                    $el(AddContentView, {path: '/add-content/:initialContentTypeName?'}, null),
                    $el(EditContentView, {path: '/edit-content/:contentNodeId'}, null),
                    $el(ManageContentTypesView, {path: '/manage-content-types'}, null),
                    $el(CreateContentTypeView, {path: '/create-content-type'}, null),
                ].concat(...this.currentPageUiPanels.map(panel=>panel.getRoutes()))
            )
        );
    }
    makeMainTabItems() {
        return $el('div', null,
            $el('section', {className: 'quick-links'},
                $el('h3', null, 'Quick links:'),
                $el('div', null,
                    myLink('/upload-website', [featherSvg('upload-cloud'), 'Upload'],
                           false),
                    myLink('/generate-website', [featherSvg('save'), 'Generate'])
                )
            ),
            $el('section', null,
                $el('h3', null, 'On this page:'),
                ...this.currentPageUiPanels.map(panel => {
                    return $el(ControlPanelSection, {
                        title: panel.getTitle(),
                        icon: typeof panel.getIcon == 'function' ? panel.getIcon() : null,
                        className: 'ui-panel ui-panel-' + panel.type
                    }, panel.getMenuItems(this.props));
                }).concat(!this.looseContentNodes.length && $el(ControlPanelSection, {
                    title: 'Other',
                    className: ''
                }, contentNodeList({
                    cnodes: this.looseContentNodes,
                    createLinkText: 'Create Content',
                    currentPageUrl: this.props.currentPageData.page.url
                })))
            )
        );
    }
    makeDevTabItems() {
        return $el('div', {className: 'list list-small'},
            $el('div', null,
                $el('h3', null, 'Layout', $el('span', null, 'Render this page using:')),
                this.state.templates.length && $el('select', {
                    value: this.state.selectedTemplateIdx,
                    onChange: e => { this.handleCurrentPageTemplateChange(e); },
                }, this.state.templates.map((t, i) =>
                    $el('option', {value: i}, t.fileName)
                ))
            ),
            $el('div', null,
                $el('h3', null, 'Content types'),
                $el('div', {className: 'list list-small'},
                    $el('div', null, myLink('/manage-content-types', 'Manage')),
                    $el('div', null, myLink('/create-content-type', 'Add new'))
                )
            ),
            $el('div', null,
                $el('h3', null, 'Site graph'),
                myLink('/edit-site-graph', 'Delete entries')
            )
        );
    }
    handleCurrentPageTemplateChange(e) {
        this.setState({selectedTemplateIdx: parseInt(e.target.value)});
        const u = this.props.currentPageData.page.url;
        const f = this.state.templates[this.state.selectedTemplateIdx].fileName;
        services.myFetch('/api/websites/current/page', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({url: u, layoutFileName: f})
        }).then(res => {
            const d = JSON.parse(res.responseText);
            if (d.numAffectedRows > 0) {
                myRedirect(u + '?rescan=usersOf:' + encodeURIComponent(f), true);
            } else {
                throw new Error('');
            }
        }, () => {
            toast('Failed to change the layout.', 'error');
        });
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
