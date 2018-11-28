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
                $el('label', null, $el('input', {
                    name: "name",
                    value: this.state.name,
                    onChange: e => this.receiveInputValue(e)
                }, null)),
                $el('label', null, $el('select', {
                    value: this.state.componentTypes.indexOf(this.state.componentType),
                    onChange: e => this.receiveCmpTypeSelection(e)
                }, this.state.componentTypes.map((type, i) =>
                    $el('option', {value: i}, type.name)
                ))),
                this.getInputElsForCmpTypeProps(this.state.componentType.props),
                $el('input', {value: 'Add', type: 'submit'}, null),
                $el('button', {type: 'button', onClick: e => { myRedirect('/') }}, 'Cancel')
            ])
        );
    }
    confirm(e) {
        e.preventDefault();
        dafetch('/api/component', {
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

////////////////////////////////////////////////////////////////////////////////

class ArticleListDirective extends preact.Component {
    static getRoutes() {
        return [];
    }
    static getName() {
        return 'Articlelist';
    }
    static getMenuItems(directive) {
        return directive.components.map(article => {
            return $el('div', null, [
                $el('span', null, article.title),
                $el('a', {href:'#/edit-component', onClick: e => {
                    e.preventDefault();
                    myRedirect('/edit-component');
                }}, 'Edit article')
            ])
        }).concat([
            $el('a', {
                href:'#add-component',
                onClick: e => {
                    e.preventDefault();
                    myRedirect('/add-component');
                }
            }, 'Add article')
        ]);
    }
}

class StaticMenuDirectiveAddPageView {
    render() {
        return $el('div', {className: 'view'},
            $el('div', null, [
                $el('p', null, '...'),
                $el('button', {onClick: e => myRedirect('/')}, 'x')
            ])
        );
    }
}
class StaticMenuDirective extends preact.Component {
    static getRoutes() {
        return [$el(StaticMenuDirectiveAddPageView, {path: "/static-menu-add-page"}, null)];
    }
    static getName() {
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

function getDirectiveImpl(name) {
    if (name === 'StaticMenu') return StaticMenuDirective;
    if (name === 'ArticleList') return ArticleListDirective;
    console.error("Directive '" + name + "' not implemented");
}

////////////////////////////////////////////////////////////////////////////////

class InsaneControlPanel extends preact.Component {
    constructor(props) {
        super(props);
        this.currentPageDirectives = props.currentPageData.directiveInstances.map(a=>getDirectiveImpl(a.type));
        this.currentPageComponents = props.currentPageData.allComponents;
        this.state = {className: '', visibleMenuItems: {}, genMessage: ''};
    }
    render() {
        return $el('div', {id: 'control-panel', className: this.state.className}, [
            $el('nav', null, [
                $el('div', null,
                    $el('button', {onclick: () => this.sendGenRequest()}, 'Generate'),
                    this.state.genMessage,
                    $el('hr', null, null)
                ),
                $el('div', null, [
                    $el('h3', null, 'On this page:'),
                    $el('div', null, this.currentPageDirectives.map((directive, i) => {
                        var n = directive.getName();
                        return $el('div', null, [
                            $el('h4', null, [
                                $el('span', null, n),
                                $el('button', {onClick:()=>this.toggleMenuItem(n)},
                                    '['+(!this.state.visibleMenuItems[n]?'+':'-')+']'
                                )
                            ]),
                            $el('div', {
                                className: !this.state.visibleMenuItems[n]?'hidden':''
                            }, directive.getMenuItems(this.props.currentPageData.directiveInstances[i]))
                        ])
                    })),
                    $el('div', null,
                        $el('h4', null, [
                            $el('span', null, 'Other'),
                            $el('button', {onClick:()=>this.toggleMenuItem('other')},
                                '['+(!this.state.visibleMenuItems.other?'+':'-')+']'
                            )
                        ]),
                        $el('ul', {className: !this.state.visibleMenuItems.other?'hidden':''}, this.currentPageComponents.map(cmp =>
                            $el('li', null, [
                                $el('span', null, cmp.name),
                                $el('a', {href:'#/edit-component', onClick: e => {
                                    e.preventDefault();
                                    myRedirect('/edit-component');
                                }}, 'Edit')
                            ])
                        )),
                        $el('div', {className: !this.state.visibleMenuItems.other?'hidden':''}, $el('a', {
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
                        var isEmpty = e.url === '/';
                        if (!e.current && !isEmpty) return;
                        window.parent.setIframeVisible(!isEmpty);
                        this.setState({className: !isEmpty ? 'open' : ''});
                    }
                }, [
                    $el(AddComponentView, {path: "/add-component"}, null),
                    $el(EditComponentView, {path: "/edit-component"}, null)
                ].concat(...this.currentPageDirectives.map(dir=>dir.getRoutes()))
            )
        ]);
    }
    toggleMenuItem(name) {
        let visibleMenuItems = this.state.visibleMenuItems;
        visibleMenuItems[name] = !visibleMenuItems[name];
        this.setState({visibleMenuItems});
    }
    sendGenRequest() {
        dafetch('/api/website/generate', {method: 'POST', data: 'a=b'}, req => {
            this.setState({genMessage: req.responseText});
        }, req => {
            this.setState({genMessage: 'Fail: ' + req.responseText});
        });
    }
}

function dafetch(url, options, onSuccess, onFail) {
    let req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState !== 4) return;
        if (req.status >= 200 && req.status < 300) {
            onSuccess(req);
        } else {
            onFail(req);
        }
    };
    req.open(options.method || 'GET', url, true);
    Object.keys(options.headers || {}).forEach(key => {
        req.setRequestHeader(key, options.headers[key]);
    });
    req.send(options.data);
}

export {InsaneControlPanel};
