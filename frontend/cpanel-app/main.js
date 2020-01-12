import '../commons/globals.js';
import UiPanelRegister from './src/UiPanelRegister.js';
import {GenericUIPanelImpl, GenericListUIPanelImpl} from './src/ui-panel-impls.js';

const uiPanelRegister = new UiPanelRegister();
uiPanelRegister.registerUiPanelImpl('Generic', GenericUIPanelImpl);
uiPanelRegister.registerUiPanelImpl('List', GenericListUIPanelImpl);

window.radCpanel = {uiPanelRegister};
export {uiPanelRegister};
