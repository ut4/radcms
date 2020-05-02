class ContentPanelOrFormRegister {
    constructor() {
        this._impls = {};
    }
    /**
     * @param {string} name
     * @param {Object} impl
     * @throws {TypeError}
     */
    registerImpl(name, impl) {
        if (name === '__proto__' || name === 'constructor')
            throw new Error(`Invalid implementation name ${name}`);
        if (this._impls[name])
            throw new TypeError(`Impl '${name}' already exists.`);
        this._impls[name] = impl;
    }
    /**
     * @param {string} name
     * @returns {Object|undefined}
     */
    getImpl(name) {
        return this._impls[name];
    }
}

export default ContentPanelOrFormRegister;
