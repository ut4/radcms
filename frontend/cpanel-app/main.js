import '../src/globals.js';
import {ControlPanel} from './src/cpanel-app.js';

preact.render($el(ControlPanel, {
    currentPageData: window.parent.getCurrentPageData()
}, null), document.getElementById('cpanel-app'));

//
var parentUrlPcs = window.parent.location.href.split('#');
var tmp = parentUrlPcs[0].split('?rescan=');
if (tmp[1]) {
    window.parent.history.replaceState(null, window.parent.document.title, tmp[0]);
    document.querySelector('base').href = tmp[0];
} else if (parentUrlPcs[1]) {
    window.location.hash = parentUrlPcs[1];
    document.querySelector('base').href = parentUrlPcs[0];
} else {
    document.querySelector('base').href = window.parent.location;
}

//
window.parent.addEventListener('hashchange', e => {
    if (e.newURL !== e.oldURL) window.location.replace(
        window.location.href.split('#')[0] + (window.parent.location.hash || '#/')
    );
});
