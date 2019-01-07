import services from './common-services.js';
import {ArticleListDirectiveWebUIImpl,
        StaticMenuDirectiveWebUIImpl} from './directive-impls.js';
import {AddComponentView, EditComponentView} from './component-views.js';
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
     *     currentPageData: Object;
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
        this.currentPageComponents = props.currentPageData.allComponents;
        this.uploadButtonEl = null;
        this.state = {className: '', visibleMenuItems: {}};
        services.myFetch('/api/website/num-pending-changes')
            .then(res => {
                const len = parseInt(res.responseText);
                if (len > 0) {
                    this.uploadButtonEl.setAttribute('data-num-pending-changes',
                                                     len);
                    this.uploadButtonEl.setAttribute('title', 'Upload ' + len +
                                                     ' pending files.');
                }
            }, () => {
                console.error('Failed to fetch pending changes.');
            });
    }
    render() {
        return $el('div', {id: 'control-panel', className: this.state.className}, [
            $el('nav', null, [
                $el('h1', null, 'InsaneCMS'),
                $el('div', null, [
                    $el('button', {
                        onclick: () => myRedirect('/generate-website'),
                        className: 'nice-button nice-button-primary'
                    }, 'Generate'),
                    $el('button', {
                        onclick: () => myRedirect('/upload-website'),
                        className: 'nice-button nice-button-primary',
                        ref: el => { this.uploadButtonEl = el; }
                    }, 'Upload')
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
                        ])
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
                        }, this.currentPageComponents.map(cmp =>
                            $el('li', null, [
                                $el('span', null, cmp.name),
                                $el('a', {href:'#/edit-component', onClick: e => {
                                    e.preventDefault();
                                    myRedirect('/edit-component');
                                }}, 'Edit')
                            ])
                        )),
                        $el('div', {
                            className: !this.state.visibleMenuItems.other?'hidden':''
                        }, $el('a', {
                                href:'#/add-component', onClick: e => {
                                e.preventDefault();
                                myRedirect('/add-component');
                            }
                        }, 'Create new component'))
                    )
                ])
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
                    $el(AddComponentView, {path: '/add-component/:initialComponentTypeName?'}, null),
                    $el(EditComponentView, {path: '/edit-component'}, null),
                    $el(WebsiteGenerateView, {path: '/generate-website'}, null),
                    $el(WebsiteUploadView, {path: '/upload-website'}, null)
                ].concat(...this.currentPageDirectiveImpls.map(dir=>dir.getRoutes()))
            )
        ]);
    }
    toggleMenuItem(name) {
        let visibleMenuItems = this.state.visibleMenuItems;
        visibleMenuItems[name] = !visibleMenuItems[name];
        this.setState({visibleMenuItems});
    }
}

export {app, InsaneControlPanel, AddComponentView};
