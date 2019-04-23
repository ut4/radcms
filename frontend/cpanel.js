import services from './common-services.js';
import {myLink, contentNodeList, featherSvg, Toaster} from './common-components.js';
import {GenericListUIPanelImpl, StaticMenuUIPanelImpl} from './ui-panel-impls.js';
import {WebsiteGenerateView, WebsiteUploadView} from './website-views.js';
import {AddContentView, EditContentView} from './content-views.js';
import {ManageContentTypesView, CreateContentTypeView} from './content-type-views.js';
import {SiteGraphEditView} from './site-graph-views.js';

const cpanelApp = {
    _uiPanelImpls: {
        'EditableList': GenericListUIPanelImpl,
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
 * Main component.
 */
class ControlPanel extends preact.Component {
    /**
     * @param {Object} props {
     *     currentPageData: {
     *         page: {
     *             url: string;
     *             layoutFileName: string;
     *         },
     *         directiveElems: Array<{
     *             uiPanelType: string;
     *             contentType: string;
     *             contentNodes: Array<{
     *                 [string]?: any;
     *                 defaults: {id: number; name: string; dataBatchConfigId: number;}
     *             }>
     *         }>,
     *         allContentNodes: Array<...>;
     *         sitePath: string;
     *     };
     * }
     */
    constructor(props) {
        super(props);
        ControlPanel.currentPageData = props.currentPageData;
        this.currentPageUiPanels = [];
        props.currentPageData.directiveElems.forEach(obj => {
            const Cls = cpanelApp.getUiPanelImpl(obj.uiPanelType);
            if (!Cls) return;
            this.currentPageUiPanels.push(new Cls(obj));
        });
        this.looseContentNodes = props.currentPageData.allContentNodes.filter(n =>
            !props.currentPageData.directiveElems.some(elem =>
                elem.contentNodes.some(n2 => n.defaults.name == n2.defaults.name)
            )
        );
        this.state = {className: '', templates: [], selectedTemplateIdx: null,
                      tabA: true, numWaitingUploads: 0};
        services.signals.listen('numWaitingUploadsChanged', newValProvideFn => {
            this.setState({numWaitingUploads: newValProvideFn(this.state.numWaitingUploads)});
        });
        services.myFetch('/api/websites/current/num-waiting-uploads')
            .then(res => {
                this.state.numWaitingUploads = parseInt(res.responseText);
                return services.myFetch('/api/websites/current/templates');
            }, () => {
                toast('Failed to fetch waiting items.', 'error');
            }).then(res => {
                const templates = JSON.parse(res.responseText);
                const fname = props.currentPageData.page.layoutFileName;
                this.setState({templates: templates,
                    selectedTemplateIdx: templates.findIndex(t => t.fileName == fname),
                    numWaitingUploads: this.state.numWaitingUploads});
            }, () => {
                toast('Failed to fetch templates.', 'error');
            });
    }
    render() {
        return $el('div', {className: this.state.className}, [
            $el(Toaster, null, null),
            $el('div', {id: 'control-panel'}, [
                myLink('/frontend/app.html', 'Back to dashboard', true),
                $el('div', {className: 'tab-links'}, [
                    $el('button', {
                        className: this.state.tabA ? 'current' : '',
                        onClick: () => { if (!this.state.tabA) this.setState({tabA: true}); }
                    }, 'Content'),
                    $el('button', {
                        className: !this.state.tabA ? 'current' : '',
                        onClick: () => { if (this.state.tabA) this.setState({tabA: false}); }
                    }, 'For devs'),
                ]),
                $el('div', {className: !this.state.tabA ? 'hidden' : ''}, this.makeMainTabItems()),
                $el('div', {className: this.state.tabA ? 'hidden' : ''}, this.makeDevTabItems()),
                $el('h1', null, 'InsaneCMS')
            ]),
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
        ]);
    }
    makeMainTabItems() {
        const uploadBtnAttrs = {};
        if (this.state.numWaitingUploads > 0) {
            const l = this.state.numWaitingUploads;
            uploadBtnAttrs['data-num-waiting-uploads'] = l;
            uploadBtnAttrs['title'] = 'Upload ' + l + ' waiting items.';
        }
        return $el('div', null,
            $el('section', {className: 'quick-links'},
                $el('h3', null, 'Quick links:'),
                $el('div', null,
                    myLink('/upload-website', [featherSvg('upload-cloud'), 'Upload'],
                           false, uploadBtnAttrs),
                    myLink('/generate-website', [featherSvg('save'), 'Generate'])
                )
            ),
            $el('section', null,
                $el('h3', null, 'On this page:'),
                ...this.currentPageUiPanels.map((panel, i) => {
                    return $el(ControlPanelSection, {
                        title: panel.getTitle(),
                        icon: typeof panel.getIcon == 'function' ? panel.getIcon() : null,
                        className: 'ui-panel ui-panel-' +
                            this.props.currentPageData.directiveElems[i].uiPanelType
                    }, panel.getMenuItems(this.props));
                }).concat($el(ControlPanelSection, {
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
        return $el('div', {className: 'list list-small'}, [
            $el('div', null, [
                $el('h3', null, ['Layout', $el('span', null, 'Render this page using:')]),
                this.state.templates.length && $el('select', {
                    value: this.state.selectedTemplateIdx,
                    onChange: e => { this.handleCurrentPageTemplateChange(e); },
                }, this.state.templates.map((t, i) =>
                    $el('option', {value: i}, t.fileName)
                ))
            ]),
            $el('div', null, [
                $el('h3', null, 'Content types'),
                $el('div', {className: 'list list-small'}, [
                    $el('div', null, myLink('/manage-content-types', 'Manage')),
                    $el('div', null, myLink('/create-content-type', 'Add new'))
                ])
            ]),
            $el('div', null, [
                $el('h3', null, 'Site graph'),
                myLink('/edit-site-graph', 'Delete entries')
            ])
        ]);
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
        return $el('div', {className: this.props.className}, [
            $el('h4', null, [
                $el('span', null,
                    featherSvg(this.props.icon || 'feather'),
                    this.props.title
                ),
                $el('button', {onClick: () => this.setState({collapsed: !this.state.collapsed})},
                    '[' + (!this.state.collapsed ? '-' : '+') + ']'
                )
            ]),
            $el('div', {
                className: !this.state.collapsed ? '' : 'hidden'
            }, this.props.children)
        ]);
    }
}

export {cpanelApp, ControlPanel};
