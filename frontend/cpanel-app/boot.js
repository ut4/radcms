import ControlPanelApp from '../cpanel-app/src/ControlPanelApp.js';

const dataFromBackend = window.radData || {};
delete window.radData;
preact.render(preact.createElement(ControlPanelApp, {
    dataFromBackend,
    ref: cmp => {
        if (cmp && !window.radCpanelApp) {
            window.radCpanelApp = {setup(data) { cmp.setup(data); }};
        }
    }
}), document.getElementById('cpanel-app'));
