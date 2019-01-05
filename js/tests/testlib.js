/*
This file contains a minimal QUnit clone:
```
var tlib = require('tests/testlib.js').testLib;
tlib.module('A package', function(hooks) {
    hooks.before(...);
    hooks.beforeEach(...);
    tlib.test('a method', function(assert) {
        assert.ok(true == false, 'true is false');
        assert.equal('actual', 'expected', 'true is false');
    });
    tlib.test('some other method', function(assert) {
        assert.ok(true == false, 'true is false');
    });
});
tlib.start();
```
*/

function Asserter() {
    this.results = [];
    this.expectNAssertions = undefined;
}
/**
 * @param {any} actual
 * @param {any} expected
 * @param {string?} message
 */
Asserter.prototype.equal = function(actual, expected, message) {
    if (actual == expected) {
        this.results.push({message: message, ok: true, details: null});
    } else {
        this.results.push({message: message, ok: false, details: 'Expected `' +
            expected + '` but was actually `' + actual + '`' + getAt()});
    }
};
/**
 * @param {Object} actual
 * @param {Object} expected
 * @param {string?} message
 */
Asserter.prototype.deepEqual = function(actual, expected, message) {
    actual = JSON.stringify(actual);
    expected = JSON.stringify(expected);
    if (actual == expected) {
        this.results.push({message: message, ok: true, details: null});
    } else {
        this.results.push({message: message, ok: false, details: 'Expected `' +
            expected + '` but was actually `' + actual + '`' + getAt()});
    }
};
/**
 * @param {bool} what
 * @param {string?} message
 */
Asserter.prototype.ok = function(what, message) {
    var ok = !!what;
    this.results.push({message: message, ok: ok, details: ok ? null : getAt()});
};
Asserter.prototype.expect = function(numberOfAssertions) {
    this.expectNAssertions = numberOfAssertions;
};
function getAt() {
    return new Error().stack.split('\n')[3].substr(4);
}

exports.testLib = {
    modules: [],
    tests: [],
    curMod: null,
    /**
     * @param {string} name
     * @param {(hooks: Hooks): void} fn
     */
    module: function(name, fn) {
        this.modules[name] = {fn: fn, tests: []};
        this.curMod = this.modules[name];
    },
    /**
     * @param {string} desc
     * @param {(assert: Asserter): void} fn
     */
    test: function(desc, fn) {
        this.curMod.tests.push({desc: desc, fn: fn});
    },
    /**
     * @param {string[]?} moduleNames
     */
    start: function(moduleNames) {
        var mods = this.modules;
        (moduleNames || Object.keys(this.modules)).forEach(function(moduleName) {
            var mod = mods[moduleName];
            if (!mod) throw new Error('Testmodule \'' + moduleName + '\' not found.');
            mod.fn();
            runModuleTests(moduleName, mod);
        });
    }
};

function runModuleTests(modName, mod) {
    mod.tests.forEach(function(test) {
        var assert = new Asserter();
        test.fn(assert);
        assert.results.forEach(function(result) {
            if (result.ok)
               console.log(modName + ': ' + test.desc + ': ok');
            else
               console.log(modName + ': ' + test.desc + ': ' +
                           (result.message || 'fail') +
                           (result.details ? ': ' + result.details : ''));
        });
        if (assert.expectNAssertions !== undefined &&
            assert.expectNAssertions != assert.results.length) {
            console.log(modName + ': ' + test.desc + ': Expected ' +
                        assert.expectNAssertions + ' assertions, but actually' +
                        ' ran ' + assert.results.length);
        }
    });
}