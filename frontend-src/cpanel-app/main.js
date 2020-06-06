import {config, urlUtils} from '@rad-commons';
import ControlPanelApp from './src/ControlPanelApp.jsx';

urlUtils.baseUrl = window.dataFromAdminBackend.baseUrl;
urlUtils.assetBaseUrl = window.dataFromAdminBackend.assetBaseUrl;
config.userPermissions = window.dataFromAdminBackend.userPermissions;
config.user = window.dataFromAdminBackend.user;

const appContainerEl = document.getElementById('cpanel-app');
preact.render(preact.createElement(ControlPanelApp, {
    dataFromAdminBackend: window.dataFromAdminBackend,
    onIsCollapsedToggled: () => {
        appContainerEl.classList.toggle('collapsed');
    }
}), appContainerEl);
