import services from './common-services.js';
import {contentNodeList} from './common-components.js';
import {ArticleListDirectiveWebUIImpl,
        StaticMenuDirectiveWebUIImpl} from './directive-impls.js';
import {AddContentView, EditContentView} from './content-views.js';
import {WebsiteGenerateView, WebsiteUploadView} from './website-views.js';

/*
 * App-singleton.
 */
const app = {
    _directiveImpls: {
        'StaticMenu': StaticMenuDirectiveWebUIImpl,
        'ArticleList': ArticleListDirectiveWebUIImpl
    },
    /**
     * @param {string} name
     * @param {Object} impl
     * @throws {TypeError}
     */
    registerDirectiveImpl: function(name, impl) {
        if (this._directiveImpls.hasOwnProperty(name))
            throw new TypeError('Directive \''+name+'\' already exists.');
        this._directiveImpls[name] = impl;
    },
    /**
     * @param {string} name
     * @returns {Object|undefined}
     */
    getDirectiveImpl: function(name) {
        return this._directiveImpls[name];
    }
};

/*
 * Main component.
 */
class InsaneControlPanel extends preact.Component {
    /**
     * @param {Object} props {
     *     currentPageData: {
     *         page: {url: <str>, layoutFileName: <str>},
     *         directiveInstances: [{type: <str>, contentNodes: [<cnode>...]...}...],
     *         allContentNodes: [{..., defaults: {id: <id>, name: <name>...}}],
     *     };
     * }
     */
    constructor(props) {
        super(props);
        this.currentPageDirectiveImpls = [];
        props.currentPageData.directiveInstances.forEach(instance => {
            const impl = app.getDirectiveImpl(instance.type);
            if (!impl) return;
            this.currentPageDirectiveImpls.push(impl);
        });
        this.looseContentNodes = props.currentPageData.allContentNodes.filter(n =>
            !props.currentPageData.directiveInstances.some(ins =>
                ins.contentNodes.some(n2 => n.defaults.name == n2.defaults.name)
            )
        );
        this.uploadButtonEl = null;
        this.state = {className: '', templates: [], selectedTemplateIdx: null,
                      tabA: true};
        services.myFetch('/api/website/num-pending-changes')
            .then(res => {
                const len = parseInt(res.responseText);
                if (len > 0) {
                    this.uploadButtonEl.setAttribute('data-num-pending-changes',
                                                     len);
                    this.uploadButtonEl.setAttribute('title', 'Upload ' + len +
                                                     ' pending files.');
                }
                return services.myFetch('/api/website/templates');
            }, () => {
                console.error('Failed to fetch pending changes.');
            }).then(res => {
                const templates = JSON.parse(res.responseText);
                const fname = props.currentPageData.page.layoutFileName;
                this.setState({templates: templates,
                    selectedTemplateIdx: templates.findIndex(t => t.fileName == fname)});
            }, () => {
                console.error('Failed to fetch templates.');
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
                    }, 'Content'),
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
                    $el(WebsiteUploadView, {path: '/upload-website'}, null)
                ].concat(...this.currentPageDirectiveImpls.map(dir=>dir.getRoutes()))
            )
        ]);
    }
    makeMainTabItems() {
        return [
            $el('div', null, [
                $el('button', {
                    onclick: () => myRedirect('/upload-website'),
                    className: 'nice-button nice-button-primary',
                    ref: el => { this.uploadButtonEl = el; }
                }, 'Upload'),
                $el('button', {
                    onclick: () => myRedirect('/generate-website'),
                    className: 'nice-button nice-button-primary'
                }, 'Generate')
            ]),
            $el('div', null, [
                $el('h3', null, 'On this page:'),
                $el('div', {className: 'current-page-directive-list'},
                    this.currentPageDirectiveImpls.map((impl, i) => {
                        const directive = this.props.currentPageData.directiveInstances[i];
                        return $el(ControlPanelSection, {
                            title: impl.getTitle(),
                            className: 'directive directive-' + directive.type
                        }, impl.getMenuItems(directive, this.props));
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
                    ))
                ])
            ])
        ];
    }
    handleCurrentPageTemplateChange(e) {
        this.setState({selectedTemplateIdx: parseInt(e.target.value)});
        const u = this.props.currentPageData.page.url;
        services.myFetch('/api/website/page', {
            method: 'PUT',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'url=' + encodeURIComponent(u) +
                  '&layoutFileName=' + encodeURIComponent(
                      this.state.templates[this.state.selectedTemplateIdx].fileName)
        }).then(res => {
            const d = JSON.parse(res.responseText);
            if (d.numAffectedRows > 0) myRedirect(u + '?rescan=current-page', true);
            else throw new Error('');
        }, () => {
            toast('Failed to change the template.', 'error');
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
                $el('span', null, this.props.title),
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

export {app, InsaneControlPanel, AddContentView};
