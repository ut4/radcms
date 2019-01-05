exports.main = function(suite) {
    var modules = [];
    var isAll = suite == 'all';
    if (isAll || suite == 'common-services') {
        require('tests/common-services-tests.js');
        modules.push('[\'common-services.js\'].db');
    }
    require('tests/testlib.js').testLib.start(!isAll ? modules : null);
};