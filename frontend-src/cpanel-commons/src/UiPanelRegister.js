class UiPanelRegister {
    constructor() {
        this._impls = {};
    }
    /**
     * @param {string} name
     * @param {Object} impl
     * @throws {TypeError}
     */
    registerUiPanelImpl(name, impl) {
        if (this._impls.hasOwnProperty(name))
            throw new TypeError('Impl \''+name+'\' already exists.');
        this._impls[name] = impl;
    }
    /**
     * @param {string} name
     * @returns {Object|undefined}
     */
    getUiPanelImpl(name) {
        return this._impls[name];
    }
}

export default UiPanelRegister;
