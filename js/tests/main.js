var commons = require('common-services.js');

commons.app.getHandler = function(url, method) {
    var fn;
    var l = this._routeMatchers.length;
    for (var i = 0; i < l; ++i) {
        if ((fn = this._routeMatchers[i](url, method))) return fn;
    }
    throw new Error('Didn\'t find handler for ' + method + ' ' + url);
};

exports.main = function(suite, logAssertions) {
    var modules = [];
    var isAll = suite == 'all';
    if (isAll || suite == 'common-services') {
        require('tests/common-services-tests.js');
        modules.push('[\'common-services.js\'].db');
        modules.push('[\'common-services.js\'].DomTree');
    }
    if (isAll || suite == 'component-handlers') {
        require('tests/component-handlers-tests.js');
        modules.push('component-handlers.js');
    }
    if (isAll || suite == 'document-data') {
        require('tests/document-data-tests.js');
        modules.push('document-data.js');
    }
    if (isAll || suite == 'file-watchers') {
        require('tests/file-watchers-tests.js');
        modules.push('file-watchers.js');
    }
    if (isAll || suite == 'website-handlers') {
        require('tests/website-handlers-tests.js');
        modules.push('website-handlers.js');
    }
    require('tests/testlib.js').testLib.start(!isAll ? modules : null, logAssertions);
};