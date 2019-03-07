import services from './common-services.js';
import {myLink, contentNodeList} from './common-components.js';
import {GenericListUIPanelImpl, StaticMenuUIPanelImpl} from './directive-impls.js';
import {AddContentView, EditContentView} from './content-views.js';
import {WebsiteGenerateView, WebsiteUploadView} from './website-views.js';
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
     *         page: {url: <str>, layoutFileName: <str>},
     *         directiveElems: [{uiPanelType: <str>, contentNodes: [<cnode>...]...}...],
     *         allContentNodes: [{..., defaults: {id: <id>, name: <name>...}}],
     *     };
     * }
     */
    constructor(props) {
        super(props);
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
        services.myFetch('/api/website/num-waiting-uploads')
            .then(res => {
                this.state.numWaitingUploads = parseInt(res.responseText);
                return services.myFetch('/api/website/templates');
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
            $el('div', {id: 'control-panel'}, [
                $el('h1', null, 'InsaneCMS'),
                $el('div', {className: 'tab-links'}, [
                    $el('button', {
                        className: this.state.tabA ? 'current' : '',
                        onClick: () => this.setState({tabA: !this.state.tabA})
                    }, 'On this page'),
                    $el('button', {
                        className: !this.state.tabA ? 'current' : '',
                        onClick: () => this.setState({tabA: !this.state.tabA})
                    }, 'For devs'),
                ]),
                $el('div', {className: !this.state.tabA ? 'hidden' : ''}, this.makeMainTabItems()),
                $el('div', {className: this.state.tabA ? 'hidden' : ''}, this.makeDevTabItems()),
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
                    $el(AddContentView, {path: '/add-content/:initialContentTypeName?'}, null),
                    $el(EditContentView, {path: '/edit-content/:contentNodeId'}, null),
                    $el(WebsiteGenerateView, {path: '/generate-website'}, null),
                    $el(WebsiteUploadView, {path: '/upload-website'}, null),
                    $el(SiteGraphEditView, {path: '/edit-site-graph'}, null)
                ].concat(...this.currentPageUiPanels.map(panel=>panel.getRoutes()))
            )
        ]);
    }
    makeMainTabItems() {
        const uploadBtnAttrs = {
            onclick: () => myRedirect('/upload-website'),
            className: 'nice-button nice-button-primary'
        };
        if (this.state.numWaitingUploads > 0) {
            const l = this.state.numWaitingUploads;
            uploadBtnAttrs['data-num-waiting-uploads'] = l;
            uploadBtnAttrs['title'] = 'Upload ' + l + ' waiting items.';
        }
        return [
            $el('div', null, [
                $el('button', uploadBtnAttrs, 'Upload'),
                $el('button', {
                    onclick: () => myRedirect('/generate-website'),
                    className: 'nice-button nice-button-primary'
                }, 'Generate')
            ]),
            $el('div', null, [
                $el('div', {className: 'current-page-ui-panels'},
                    this.currentPageUiPanels.map((panel, i) => {
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
            ])
        ];
    }
    makeDevTabItems() {
        return [
            $el('div', null, [
                $el('div', null, [
                    $el('h3', null, ['Layout', $el('span', null, 'Render this page using:')]),
                    this.state.templates.length && $el('select', {
                        value: this.state.selectedTemplateIdx,
                        onChange: e => { this.handleCurrentPageTemplateChange(e); },
                    }, this.state.templates.map((t, i) =>
                        $el('option', {value: i}, t.fileName)
                    )),
                    $el('div', null,
                        myLink('/edit-site-graph', 'Edit site graph')
                    )
                ])
            ])
        ];
    }
    handleCurrentPageTemplateChange(e) {
        this.setState({selectedTemplateIdx: parseInt(e.target.value)});
        const u = this.props.currentPageData.page.url;
        const f = this.state.templates[this.state.selectedTemplateIdx].fileName;
        services.myFetch('/api/website/page', {
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
                    $el('img', {src: '/frontend/assets/icon-sprite.svg#' +
                        (this.props.icon || 'feather')}, null),
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

export {ControlPanel};