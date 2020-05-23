import {config} from '@rad-commons';
import ControlPanelApp from './src/ControlPanelApp.jsx';

config.baseUrl = window.dataFromAdminBackend.baseUrl;
config.assetBaseUrl = window.dataFromAdminBackend.assetBaseUrl;
config.userPermissions = window.dataFromAdminBackend.userPermissions;
config.user = window.dataFromAdminBackend.user;

const appContainerEl = document.getElementById('cpanel-app');
preact.render(preact.createElement(ControlPanelApp, {
    dataFromAdminBackend: window.dataFromAdminBackend,
    onIsCollapsedToggled: () => {
        appContainerEl.classList.toggle('collapsed');
    }
}), appContainerEl);
