var commons = require('common-services.js');
var website = require('website.js');

commons.log = function() {};

commons.app.getHandler = function(url, method) {
    var fn;
    var l = this._routeMatchers.length;
    for (var i = 0; i < l; ++i) {
        if ((fn = this._routeMatchers[i](url, method))) return fn;
    }
    throw new Error('Didn\'t find handler for ' + method + ' ' + url);
};

website.siteGraph.clear = function() {
    this.pages = {};
    this.pageCount = 0;
    this.templates = {};
    this.templateCount = 0;
};

exports.main = function(suite, logAssertions) {
    var modules = [];
    var isAll = suite == 'all';
    if (isAll || suite == 'common-services') {
        require('tests/common-services-tests.js');
        modules.push('[\'common-services.js\'].db');
        modules.push('[\'common-services.js\'].DomTree');
    }
    if (isAll || suite == 'content-handlers') {
        require('tests/content-handlers-tests.js');
        modules.push('content-handlers.js');
    }
    if (isAll || suite == 'document-data') {
        require('tests/document-data-tests.js');
        modules.push('document-data.js');
    }
    if (isAll || suite == 'file-watchers') {
        require('tests/file-watchers-tests.js');
        modules.push('file-watchers.js');
    }
    if (isAll || suite == 'link-diff') {
        require('tests/link-diff-tests.js');
        modules.push('link-diff');
    }
    if (isAll || suite == 'page-diff') {
        require('tests/page-diff-tests.js');
        modules.push('page-diff');
    }
    if (isAll || suite == 'resource-diff') {
        require('tests/resource-diff-tests.js');
        modules.push('resource-diff');
    }
    if (isAll || suite == 'website-handlers') {
        require('tests/website-handlers-tests.js');
        modules.push('website-handlers.js');
    }
    if (isAll || suite == 'website') {
        require('tests/website-tests.js');
        modules.push('[\'website.js\'].website');
        modules.push('[\'website.js\'].siteConfig');
    }
    require('tests/testlib.js').testLib.start(!isAll ? modules : null, logAssertions);
};