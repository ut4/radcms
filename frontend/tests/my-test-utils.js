const utils = {
    /**
     * @param {string} type
     * @param {Element} el
     */
    triggerEvent(type, el) {
        const event = document.createEvent('HTMLEvents');
        event.initEvent(type, false, true);
        el.dispatchEvent(event);
    },
    /**
     * @param {any} value
     * @param {Element} el
     * @param {string?} eventType = 'change'
     */
    setInputValue(value, el, eventType = 'change') {
        el.value = value;
        utils.triggerEvent(eventType, el);
    },
    /**
     * @param {boolean} checked
     * @param {HTMLInputElement} el
     */
    setChecked(checked, el) {
        el.checked = checked;
        utils.triggerEvent('change', el);
    },
    /**
     * @param {number} index
     * @param {HTMLSelectElement} el
     */
    setDropdownIndex(index, el) {
        el.selectedIndex = index;
        utils.triggerEvent('change', el);
    },
};

export default utils;
