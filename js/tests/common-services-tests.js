var commons = require('common-services.js');
var testLib = require('tests/testlib.js').testLib;

testLib.module('[\'common-services.js\'].db', function() {
    testLib.test('insert() valid', function(assert) {
        assert.expect(4);
        var sql = 'insert into componentTypes values (?,?),(?,?)';
        var success = commons.db.insert(sql, function bind(stmt) {
            stmt.bindInt(0, 1);
            stmt.bindString(1, 'foo');
            stmt.bindInt(2, 2);
            stmt.bindString(3, 'bar');
        });
        //
        assert.ok(success, 'returns succesfully');
        //
        var actuallyInserted = [];
        commons.db.selectAll('select id, `name` from componentTypes', function map(row) {
            actuallyInserted.push({id: row.getInt(0), name: row.getString(1)});
        });
        assert.equal(actuallyInserted.length, 2, 'inserts 2 rows');
        assert.deepEqual(actuallyInserted[0], {id: 1, name: 'foo'});
        assert.deepEqual(actuallyInserted[1], {id: 2, name: 'bar'});
    });
    testLib.test('insert() invalid', function(assert) {
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
    testLib.test('selectAll() valid', function(assert) {
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
        var sql = 'select id, `graph` from websites order by id';
        commons.db.selectAll(sql, function map(row, nthRow) {
            selected.push({
                id: row.getInt(0),
                graph: row.getString(1),
                nthRow: nthRow
            });
        });
        assert.equal(selected.length, 3, 'selects 3 rows');
        testData[0].nthRow = 1;
        testData[1].nthRow = 0;
        testData[2].nthRow = 2;
        assert.deepEqual(selected[0], testData[1]);
        assert.deepEqual(selected[1], testData[0]);
        assert.deepEqual(selected[2], testData[2]);
    });
    testLib.test('selectAll() invalid', function(assert) {
        assert.expect(2);
        //
        var runInvalid = function(sql, mapFn) {
            try {
                commons.db.selectAll(sql, mapFn);
            } catch (e) {
                return e.message;
            }
        };
        assert.equal(runInvalid('select id from websites', function map(row) {
            row.getInt(45);
        }), 'RangeError: col index 45 too large (max 0)');
        assert.equal(runInvalid('select foo from bar', function map(_) {
            //
        }), 'Failed to create stmt: no such table: bar');
    });
});