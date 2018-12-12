import './AddComponentViewCmpTests.js';
import './ControlPanelCmpTests.js';
import './websiteViewCmpsTests.js';

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
