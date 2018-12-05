import {myFetch} from './common.js';

class AddComponentView extends preact.Component {
    constructor() {
        super();
        this.state = {
            name: '',
            componentType: null,
            componentTypes: [
                {id: 1, name: 'Generic', props: [
                    {id: 1, name: 'content', type: 'richtext'}
                ]},
                {id: 2, name: 'Article', props: [
                    {id: 2, name: 'title', type: 'text'},
                    {id: 3, name: 'body', type: 'richtext'}
                ]}
            ]
        };
        this.state.componentType = this.state.componentTypes[0];
    }
    render() {
        return $el('form', {className: 'view', onSubmit: e => this.confirm(e)},
            $el('div', null, [
                $el('h2', null, 'Add component'),
                $el('label', null, [
                    $el('span', null, 'Nimi'),
                    $el('input', {
                        name: 'name',
                        value: this.state.name,
                        onChange: e => this.receiveInputValue(e)
                    }, null)
                ]),
                $el('label', null, [
                    $el('span', null, 'Tyyppi'),
                    $el('select', {
                        value: this.state.componentTypes.indexOf(this.state.componentType),
                        onChange: e => this.receiveCmpTypeSelection(e)
                    }, this.state.componentTypes.map((type, i) =>
                        $el('option', {value: i}, type.name)
                    ))
                ]),
                this.getInputElsForCmpTypeProps(this.state.componentType.props),
                $el('div', {className: 'form-buttons'},
                    $el('input', {
                        value: 'Add',
                        type: 'submit',
                        className: 'nice-button nice-button-primary'
                    }, null),
                    $el('button', {
                        type: 'button',
                        onClick: e => { myRedirect('/') },
                        className: 'text-button'
                    }, 'Cancel')
                )
            ])
        );
    }
    confirm(e) {
        e.preventDefault();
        myFetch('/api/component', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'name=' + encodeURIComponent(this.state.name) +
                   '&json=' + encodeURIComponent(collectCmpKeyVals(this.state)) +
                   '&componentTypeId=' + encodeURIComponent(this.state.componentType.id)
        }, req => {
            console.log('success');
            myRedirect('/', true);
        }, req => {
            console.log('error',req);
        });
    }
    receiveInputValue(e) {
        this.setState({[e.target.name]: e.target.value});
    }
    receiveCmpTypeSelection(e) {
        this.setState({componentType: this.state.componentTypes[e.target.value]});
    }
    getInputElsForCmpTypeProps(props) {
        var inputEls = []
        props.forEach(prop => {
            var stateKey = 'val-' + prop.name;
            if (!this.state.hasOwnProperty(stateKey)) {
                this.state[stateKey] = null;
            }
            inputEls.push($el('label', null, [
                $el('span', '', prop.name.toUpperCase()[0] + prop.name.substr(1)),
                $el(prop.name == 'richtext' ? 'textarea' : 'input', {
                    name: stateKey,
                    value: this.state[stateKey],
                    onChange: e => this.receiveInputValue(e)
                }, null)
            ]));
        });
        return $el('div', null, inputEls);
    }
}
function collectCmpKeyVals(state) {
    var out = {};
    state.componentType.props.forEach(prop => {
        out[prop.name] = state['val-' + prop.name];
    });
    return JSON.stringify(out);
}

class EditComponentView extends preact.Component {
    render() {
        return $el('div', {className: 'view'}, $el('div', null,
            $el('p', null, 'todo')
        ));
    }
}

/*
 * Implements end-user management views (editing articles, creating new articles
 * etc.) for <ArticleList/> directives.
 */
class ArticleListDirectiveWebUIImpl extends preact.Component {
    static getRoutes() {
        return [];
    }
    static getTitle() {
        return 'Article list';
    }
    static getMenuItems(directive) {
        return directive.components.map(article => {
            return $el('div', null, [
                $el('span', null, article.title),
                $el('a', {href:'#/edit-component', onClick: e => {
                    e.preventDefault();
                    myRedirect('/edit-component');
                }}, 'Edit')
            ])
        }).concat([
            $el('a', {
                href:'#/add-component',
                onClick: e => {
                    e.preventDefault();
                    myRedirect('/add-component');
                }
            }, 'Add article')
        ]);
    }
}

class StaticMenuAddPageView {
    render() {
        return $el('div', {className: 'view'},
            $el('div', null, [
                $el('p', null, '...'),
                $el('button', {onClick: e => myRedirect('/')}, 'x')
            ])
        );
    }
}
/*
 * Implements end-user management views (adding links, reordering links etc.)
 * for <StaticMenu/> directives.
 */
class StaticMenuDirectiveWebUIImpl extends preact.Component {
    static getRoutes() {
        return [
            $el(StaticMenuAddPageView, {path: '/static-menu-add-page'}, null)
        ];
    }
    static getTitle() {
        return 'Static menu';
    }
    static getMenuItems(directive) {
        return directive.components.map(article => {
            return $el('span', null, article.title)
        }).concat([
            $el('a', {
                href:'#static-menu-add-page',
                onClick: e => {
                    e.preventDefault();
                    myRedirect('/static-menu-add-page');
                }
            }, 'Add page')
        ]);
    }
}

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
    getDirectiveImpl: function (name) {
        return this._directiveImpls[name];
    }
};

/*
 * Main component.
 */
class InsaneControlPanel extends preact.Component {
    constructor(props) {
        super(props);
        this.currentPageDirectiveImpls = [];
        props.currentPageData.directiveInstances.forEach(instance => {
            const impl = app.getDirectiveImpl(instance.type);
            if (!impl) return;
            this.currentPageDirectiveImpls.push(impl);
        });
        this.currentPageComponents = props.currentPageData.allComponents;
        this.state = {className: '', visibleMenuItems: {}, genMessage: ''};
    }
    render() {
        return $el('div', {id: 'control-panel', className: this.state.className}, [
            $el('nav', null, [
                $el('h1', null, 'InsaneCMS'),
                $el('div', null, [
                    $el('button', {
                        onclick: () => this.sendGenRequest(),
                        className: 'nice-button nice-button-primary'
                    }, 'Generate'),
                    this.state.genMessage
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
                    $el(AddComponentView, {path: '/add-component'}, null),
                    $el(EditComponentView, {path: '/edit-component'}, null)
                ].concat(...this.currentPageDirectiveImpls.map(dir=>dir.getRoutes()))
            )
        ]);
    }
    toggleMenuItem(name) {
        let visibleMenuItems = this.state.visibleMenuItems;
        visibleMenuItems[name] = !visibleMenuItems[name];
        this.setState({visibleMenuItems});
    }
    sendGenRequest() {
        myFetch('/api/website/generate', {method: 'POST', data: 'a=b'}, req => {
            this.setState({genMessage: req.responseText});
        }, req => {
            this.setState({genMessage: 'Fail: ' + req.responseText});
        });
    }
}

export {app, InsaneControlPanel};
