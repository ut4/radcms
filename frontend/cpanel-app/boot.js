import {services} from '../rad-commons.js';
import {ControlPanelApp, uiPanelRegister} from '../rad-cpanel.js';

injectMainWindowControlPanelCss();
hookUpMainWindowUrlMirroring();
renderTheApp();

function injectMainWindowControlPanelCss() {
    const mainWindowDoc = window.parent.document;
    const s = document.createElement('style');
    s.innerHTML = document.getElementById('main-window-admin-css').innerText;
    mainWindowDoc.head.appendChild(s);
}

function hookUpMainWindowUrlMirroring() {
    const parentUrlPcs = window.parent.location.href.split('#');
    if (parentUrlPcs[1])
        window.location.hash = parentUrlPcs[1];
    //
    window.parent.addEventListener('hashchange', e => {
        if (e.newURL !== e.oldURL) {
            window.location.replace(
                window.location.href.split('#')[0] + (window.parent.location.hash || '#/')
            );
        }
    });
}

function renderTheApp() {
    const props = window.cpanelProps;
    delete window.cpanelProps;
    props.uiPanelRegister = uiPanelRegister;
    props.mainWindowDoc = window.parent.document;
    props.mainWindowIframeEl = props.mainWindowDoc.getElementById('rad-cpanel-iframe');
    services.config.baseUrl = props.baseUrl;
    services.config.assetBaseUrl = props.assetBaseUrl;
    preact.render(preact.createElement(ControlPanelApp, props),
                  document.getElementById('cpanel-app'));
}
