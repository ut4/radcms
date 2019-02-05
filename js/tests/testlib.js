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

function Hooks() {
    this.beforeAllFn = null;
    this.afterAllFn = null;
    this.beforeEachFn = null;
    this.afterEachFn = null;
}
Hooks.prototype.before = function(fn) { this.beforeAllFn = fn; };
Hooks.prototype.after = function(fn) { this.afterAllFn = fn; };
Hooks.prototype.beforeEach = function(fn) { this.beforeEachFn = fn; };
Hooks.prototype.afterEach = function(fn) { this.afterEachFn = fn; };
Hooks.prototype.runBeforeAllClb = function() { if (this.beforeAllFn) this.beforeAllFn(); };
Hooks.prototype.runAfterAllClb = function() { if (this.afterAllFn) this.afterAllFn(); };
Hooks.prototype.runBeforeEachClb = function() { if (this.beforeEachFn) this.beforeEachFn(); };
Hooks.prototype.runAfterEachClb = function() { if (this.afterEachFn) this.afterEachFn(); };

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
     * @param {bool?} logAssertions
     */
    start: function(moduleNames, logAssertions) {
        var self = this;
        var stats = {numPasses: 0, numFails: 0};
        var verboseLogFn = !logAssertions ? function() {} : print;
        (moduleNames || Object.keys(self.modules)).forEach(function(moduleName) {
            self.curMod = self.modules[moduleName];
            if (!self.curMod) throw new Error('Testmodule \'' + moduleName + '\' not found.');
            var hooks = new Hooks();
            self.curMod.fn(hooks);
            hooks.runBeforeAllClb();
            runModuleTests(moduleName, self.curMod, hooks, stats, verboseLogFn);
            hooks.runAfterAllClb();
        });
        print('== Test results ========');
        print(stats.numFails + ' failures, ' + stats.numPasses + ' passes');
    }
};

function runModuleTests(modName, mod, hooks, stats, verboseLogFn) {
    mod.tests.forEach(function(test) {
        var assert = new Asserter();
        hooks.runBeforeEachClb();
        test.fn(assert);
        hooks.runAfterEachClb();
        assert.results.forEach(function(result) {
            if (result.ok) {
                verboseLogFn(modName + ': ' + test.desc + ': ok');
               stats.numPasses++;
            } else {
                print(modName + ': ' + test.desc + ': ' +
                      (result.message || 'fail') +
                      (result.details ? ': ' + result.details : ''));
                stats.numFails++;
            }
        });
        if (assert.expectNAssertions !== undefined &&
            assert.expectNAssertions != assert.results.length) {
            verboseLogFn(modName + ': ' + test.desc + ': Expected ' +
                         assert.expectNAssertions + ' assertions, but actually' +
                         ' ran ' + assert.results.length);
            stats.numFails++;
        }
    });
}
