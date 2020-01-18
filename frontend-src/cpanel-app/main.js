import ControlPanelApp from './src/ControlPanelApp.jsx';

const appContainerEl = document.getElementById('cpanel-app');
const dataFromBackend = window.radData || {};
delete window.radData;
preact.render(preact.createElement(ControlPanelApp, {
    dataFromBackend,
    onIsCollapsedToggled: () => {
        appContainerEl.classList.toggle('collapsed');
    },
    ref: cmp => {
        if (cmp && !window.radCpanelApp) {
            window.radCpanelApp = {setup(data) { cmp.setup(data); }};
        }
    }
}), appContainerEl);
