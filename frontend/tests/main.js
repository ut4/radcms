import '../cpanel-app/tests/content-view-cmps-tests.js';
import '../cpanel-app/tests/control-panel-cmp-tests.js';
import '../cpanel-app/tests/site-graph-view-cmps-tests.js';
import '../cpanel-app/tests/website-view-cmps-tests.js';

QUnit.config.autostart = false;
QUnit.dump.maxDepth = 8; // default 5
QUnit.moduleDone(() => {
    let el = document.querySelector('script:last-of-type').nextElementSibling;
    while (el) {
        const copy = el;
        el = el.nextElementSibling;
        document.body.removeChild(copy);
    }
});
QUnit.start();
