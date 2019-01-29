import services from './common-services.js';
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
     *         page: {url: <url>, layoutFileName: <str>},
     *         directiveInstances: [{type: <str>, contentNodes: [<cnode>...]}...],
     *         allContentNodes: [<cnode>...]
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
        this.state = {className: '', visibleMenuItems: {}, templates: [],
                      selectedTemplateIdx: null, tabA: true};
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
                var templates = JSON.parse(res.responseText);
                var fname = props.currentPageData.page.layoutFileName;
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
                        var isIndex = e.url === '/';
                        if (!e.current && !isIndex) return;
                        window.parent.setIframeVisible(!isIndex);
                        this.setState({className: !isIndex ? 'open' : ''});
                    }
                }, [
                    $el(AddContentView, {path: '/add-content/:initialContentTypeName?'}, null),
                    $el(EditContentView, {path: '/edit-content'}, null),
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
                $el('div', {
                    className: 'current-page-directive-list'
                }, this.currentPageDirectiveImpls.map((impl, i) => {
                    var nth = i.toString();
                    var directive = this.props.currentPageData.directiveInstances[i];
                    return $el('div', {className: 'directive-' + directive.type}, [
                        $el('h4', null, [
                            $el('span', null, impl.getTitle()),
                            $el('button', {onClick:()=>this.toggleMenuItem(nth)},
                                '['+(!this.state.visibleMenuItems[nth]?'+':'-')+']'
                            )
                        ]),
                        $el('div', {
                            className: !this.state.visibleMenuItems[nth]?'hidden':''
                        }, impl.getMenuItems(directive))
                    ]);
                })),
                $el('div', null,
                    $el('h4', null, [
                        $el('span', null, 'Other'),
                        $el('button', {onClick:()=>this.toggleMenuItem('other')},
                            '['+(!this.state.visibleMenuItems.other?'+':'-')+']'
                        )
                    ]),
                    $el('ul', {
                        className: !this.state.visibleMenuItems.other?'hidden':''
                    }, this.looseContentNodes.map(c =>
                        $el('li', null, [
                            $el('span', null, c.defaults.name),
                            $el('a', {href: '#/edit-content', onClick: e => {
                                e.preventDefault();
                                myRedirect('/edit-content');
                            }}, 'Edit')
                        ])
                    )),
                    $el('div', {
                        className: !this.state.visibleMenuItems.other?'hidden':''
                    }, $el('a', {
                            href: '#/add-content', onClick: e => {
                            e.preventDefault();
                            myRedirect('/add-content');
                        }
                    }, 'Create content'))
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
        var u = this.props.currentPageData.page.url;
        services.myFetch('/api/website/page', {
            method: 'PUT',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'url=' + encodeURIComponent(u) +
                  '&layoutFileName=' + encodeURIComponent(
                      this.state.templates[this.state.selectedTemplateIdx].fileName)
        }).then(res => {
            var d = JSON.parse(res.responseText);
            if (d.numAffectedRows > 0) myRedirect(u + '?rescan=1', true);
            else throw new Error('');
        }, () => {
            toast('Failed to change the template.', 'error');
        });
    }
    toggleMenuItem(name) {
        let visibleMenuItems = this.state.visibleMenuItems;
        visibleMenuItems[name] = !visibleMenuItems[name];
        this.setState({visibleMenuItems});
    }
}

export {app, InsaneControlPanel, AddContentView};
