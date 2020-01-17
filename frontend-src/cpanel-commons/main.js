import UiPanelRegister from './src/UiPanelRegister.js';
import {GenericUIPanelImpl, GenericListUIPanelImpl} from './src/ui-panel-impls.jsx';
import ContentNodeUtils from './src/ContentNodeUtils.js';

const uiPanelRegister = new UiPanelRegister();
uiPanelRegister.registerUiPanelImpl('Generic', GenericUIPanelImpl);
uiPanelRegister.registerUiPanelImpl('List', GenericListUIPanelImpl);

export {uiPanelRegister, ContentNodeUtils};
