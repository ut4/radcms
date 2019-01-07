exports.main = function(suite) {
    var modules = [];
    var isAll = suite == 'all';
    if (isAll || suite == 'common-services') {
        require('tests/common-services-tests.js');
        modules.push('[\'common-services.js\'].db');
        modules.push('[\'common-services.js\'].DomTree');
    }
    if (isAll || suite == 'website-handlers') {
        require('tests/website-handlers-tests.js');
        modules.push('website-handlers.js');
    }
    require('tests/testlib.js').testLib.start(!isAll ? modules : null);
};