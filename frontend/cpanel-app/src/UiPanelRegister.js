import {GenericUIPanelImpl, GenericListUIPanelImpl, StaticMenuUIPanelImpl} from './ui-panel-impls.js';

const uiPanelRegister = {
    _uiPanelImpls: {
        'List': GenericListUIPanelImpl,
        'Generic': GenericUIPanelImpl,
        'StaticMenu': StaticMenuUIPanelImpl
    },
    /**
     * @param {string} name
     * @param {Object} impl
     * @throws {TypeError}
     */
    registerUiPanelImpl: function(name, impl) {
        if (this._uiPanelImpls.hasOwnProperty(name))
            throw new TypeError('Impl \''+name+'\' already exists.');
        this._uiPanelImpls[name] = impl;
    },
    /**
     * @param {string} name
     * @returns {Object|undefined}
     */
    getUiPanelImpl: function(name) {
        return this._uiPanelImpls[name];
    }
};

export default uiPanelRegister;
