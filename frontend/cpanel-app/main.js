import '../commons/globals.js';
import ControlPanelApp from './src/ControlPanelApp.js';
import {GenericUIPanelImpl, GenericListUIPanelImpl} from './src/ui-panel-impls.js';
import UiPanelRegister from './src/UiPanelRegister.js';

const uiPanelRegister = new UiPanelRegister();
uiPanelRegister.registerUiPanelImpl('Generic', GenericUIPanelImpl);
uiPanelRegister.registerUiPanelImpl('List', GenericListUIPanelImpl);

window.radCpanel = {uiPanelRegister, ControlPanelApp};
export {uiPanelRegister, ControlPanelApp};
