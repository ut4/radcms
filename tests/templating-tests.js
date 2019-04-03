const {DomTree} = require('../src/templating.js');

QUnit.module('[\'templating.js\'].DomTree', () => {
    QUnit.test('render() renders basic tree', assert => {
        assert.expect(1);
        let domTree = new DomTree();
        let rootElemRef = domTree.createElement('div', null, [ // multiple nodes as children
            domTree.createElement('h2', null,                  // single node as a children
                domTree.createElement('span', null, 'foo')     // text as a children
            ),
            domTree.createElement('p', null, 'bar')
        ]);
        assert.equal(domTree.render(rootElemRef),
            '<div><h2><span>foo</span></h2><p>bar</p></div>'
        );
    });
    QUnit.test('render() flattens nested child-arrays', assert => {
        assert.expect(1);
        let domTree = new DomTree();
        let rootElemRef = domTree.createElement('div', null, [' a ', [
            domTree.createElement('i', null, 'i1'),
            domTree.createElement('i', null, 'i2')
        ], ' b ']);
        assert.equal(domTree.render(rootElemRef),
            '<div> a <i>i1</i><i>i2</i> b </div>'
        );
    });
    QUnit.test('render() renders attributes', assert => {
        assert.expect(1);
        let domTree = new DomTree();
        let rootElemRef = domTree.createElement('div', {foo: 'bar'}, [
            domTree.createElement('div', {baz: 'naz', gas: 'maz foo'}, 'Foo'),
            domTree.createElement('div', {foo: null, bar: undefined}, '')
        ]);
        assert.equal(domTree.render(rootElemRef),
            '<div foo="bar">' +
                '<div baz="naz" gas="maz foo">Foo</div>' +
                '<div foo="" bar=""></div>' +
            '</div>'
        );
    });
    QUnit.test('render() strigifies non-string children', assert => {
        assert.expect(1);
        let domTree = new DomTree();
        let rootElemRef = domTree.createElement('div', null, [
            domTree.createElement('p', null, []),
            domTree.createElement('p', null, null),
            domTree.createElement('p', null, undefined),
            domTree.createElement('p', null, true)
        ]);
        assert.equal(domTree.render(rootElemRef),
            '<div>' +
                '<p></p>' +
                '<p>null</p>' +
                '<p>undefined</p>' +
                '<p>true</p>' +
            '</div>'
        );
    });
    QUnit.test('render() renders function components', assert => {
        assert.expect(1);
        let domTree = new DomTree();
        let myFnComponent = (props, domTreeRef) => {
            return domTreeRef.createElement('p', null, 'Hello ' + props.key);
        };
        let another = (props, domTreeRef) => {
            return domTreeRef.createElement('span', null,
                domTreeRef.createElement('b', null, 'Bello ' + props.letter)
            );
        };
        let rootElemRef = domTree.createElement('div', null, [
            domTree.createElement(myFnComponent, {key: 'val'}, null),
        ].concat(['a', 'b'].map(letter => {
            return domTree.createElement('p', null,
                domTree.createElement(another, {letter: letter}, null)
            );
        })));
        assert.equal(domTree.render(rootElemRef),
            '<div>'+
            '<p>Hello val</p>'+
            '<p><span><b>Bello a</b></span></p>'+
            '<p><span><b>Bello b</b></span></p>'+
            '</div>'
        );
    });
    QUnit.test('getRenderedElements(tree) returns el nodes', assert => {
        assert.expect(3);
        let domTree = new DomTree();
        let els = domTree.getRenderedElements(domTree.createElement('div', null,
            domTree.createElement('p', {foo: 'bar'}, 'hello')
        ));
        assert.equal(els.length, 2, 'Should return 2 elNodes');
        assert.equal(els[0].tagName, 'div');
        assert.equal(els[1].tagName, 'p');
    });
    QUnit.test('getRenderedFnComponents(tree) returns func cmp nodes', assert => {
        assert.expect(3);
        let domTree = new DomTree();
        let myFnComponent = (_, domTreeRef) => {
            return domTreeRef.createElement('p', null, 'Hello');
        };
        let funcs = domTree.getRenderedFnComponents(domTree.createElement('div', null,
            domTree.createElement(myFnComponent, {foo: 'bar'}, null)
        ));
        assert.equal(funcs.length, 1, 'Should return 1 component func');
        assert.deepEqual(funcs[0].props, {foo:'bar'}, 'funcNode1.props == props');
        assert.ok(funcs[0].fn, myFnComponent, 'funcNode1.fn == myFunc');
    });
});
