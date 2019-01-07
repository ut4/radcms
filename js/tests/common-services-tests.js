var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('[\'common-services.js\'].db', function() {
    testLib.test('insert() inserts data', function(assert) {
        assert.expect(4);
        var sql = 'insert into componentTypes values (?,?),(?,?)';
        var success = commons.db.insert(sql, function bind(stmt) {
            stmt.bindInt(0, 1);
            stmt.bindString(1, 'foo');
            stmt.bindInt(2, 2);
            stmt.bindString(3, 'bar');
        });
        //
        assert.ok(success, 'should return succesfully');
        //
        var actuallyInserted = [];
        commons.db.select('select id, `name` from componentTypes', function map(row) {
            actuallyInserted.push({id: row.getInt(0), name: row.getString(1)});
        });
        assert.equal(actuallyInserted.length, 2, 'should insert 2 rows');
        assert.deepEqual(actuallyInserted[0], {id: 1, name: 'foo'});
        assert.deepEqual(actuallyInserted[1], {id: 2, name: 'bar'});
    });
    testLib.test('insert() validates stuff', function(assert) {
        assert.expect(3);
        var runInvalid = function(bindFn) {
            try {
                commons.db.insert('insert into components(`name`) values (?)',
                                  bindFn);
            } catch (e) {
                return e.message;
            }
        };
        assert.equal(runInvalid(function bind(stmt) {
            stmt.bindInt(2,1);
        }), 'RangeError: Bind index 2 too large (max 0)');
        assert.equal(runInvalid(function bind(stmt) {
            stmt.bindInt(0, "notAnInt");
        }), 'TypeError: number required, found \'notAnInt\' (stack index 1)');
        assert.equal(runInvalid(function bind(stmt) {
            stmt.bindString(0, {});
        }), 'TypeError: string required, found [object Object] (stack index 1)');
    });
    testLib.test('select() fetches data', function(assert) {
        assert.expect(4);
        var sql = 'insert into websites values (?,?),(?,?),(?,?)';
        var testData = [
            {id: 45, graph: 'graph1'},
            {id: 23, graph: 'graph2'},
            {id: 76, graph: 'graph3'}
        ];
        if (!commons.db.insert(sql, function bind(stmt) {
            stmt.bindInt(0, testData[0].id);
            stmt.bindString(1, testData[0].graph);
            stmt.bindInt(2, testData[1].id);
            stmt.bindString(3, testData[1].graph);
            stmt.bindInt(4, testData[2].id);
            stmt.bindString(5, testData[2].graph);
        })) throw new Error('Failed to insert test data');
        //
        var selected = [];
        var sql2 = 'select id, `graph` from websites order by id';
        commons.db.select(sql2, function map(row, nthRow) {
            selected.push({
                id: row.getInt(0),
                graph: row.getString(1),
                nthRow: nthRow
            });
        });
        assert.equal(selected.length, 3, 'should map 3 rows');
        testData[0].nthRow = 1;
        testData[1].nthRow = 0;
        testData[2].nthRow = 2;
        assert.deepEqual(selected[0], testData[1]);
        assert.deepEqual(selected[1], testData[0]);
        assert.deepEqual(selected[2], testData[2]);
    });
    testLib.test('select() validates stuff', function(assert) {
        assert.expect(2);
        //
        var runInvalid = function(sql, mapFn) {
            try {
                commons.db.select(sql, mapFn);
            } catch (e) {
                return e.message;
            }
        };
        assert.equal(runInvalid('select id from websites', function map(row) {
            row.getInt(45);
        }), 'RangeError: Col index 45 too large (max 0)');
        assert.equal(runInvalid('select foo from bar', function map() {
            //
        }), 'Failed to create stmt: no such table: bar');
    });
});

testLib.module('[\'common-services.js\'].DomTree', function() {
    testLib.test('render() renders basic tree', function(assert) {
        assert.expect(1);
        var domTree = new commons.DomTree();
        var rootElemRef = domTree.createElement('div', null, [ // multiple nodes as children
            domTree.createElement('h2', null,                  // single node as a children
                domTree.createElement('span', null, 'foo')     // text as a children
            ),
            domTree.createElement('p', null, 'bar')
        ]);
        assert.equal(domTree.render(rootElemRef),
            '<div><h2><span>foo</span></h2><p>bar</p></div>'
        );
    });
    testLib.test('render() flattens nested child-arrays', function(assert) {
        assert.expect(1);
        var domTree = new commons.DomTree();
        var rootElemRef = domTree.createElement('div', null, [' a ', [
            domTree.createElement('i', null, 'i1'),
            domTree.createElement('i', null, 'i2')
        ], ' b ']);
        assert.equal(domTree.render(rootElemRef),
            '<div> a <i>i1</i><i>i2</i> b </div>'
        );
    });
    testLib.test('render() renders attributes', function(assert) {
        assert.expect(1);
        var domTree = new commons.DomTree();
        var rootElemRef = domTree.createElement('div', {foo: 'bar'}, [
            domTree.createElement('div', {baz: 'naz', gas: 'maz foo'}, 'Foo'),
            domTree.createElement('div', {foo: null, bar: undefined}, '')
        ]);
        assert.equal(domTree.render(rootElemRef),
            '<div foo="bar">' +
                '<div baz="naz" gas="maz foo">Foo</div>' +
                '<div foo="null" bar="undefined"></div>' +
            '</div>'
        );
    });
    testLib.test('render() strigifies non-string children', function(assert) {
        assert.expect(1);
        var domTree = new commons.DomTree();
        var rootElemRef = domTree.createElement('div', null, [
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
});