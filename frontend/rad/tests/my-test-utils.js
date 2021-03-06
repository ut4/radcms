const utils = {
    /**
     * @param {React.Component} reactCmp
     * @param {Object} props
     */
    renderIntoDocument(reactCmp, props) {
        return preact.render(preact.createElement(reactCmp, props),
                             document.getElementById('render-container-el'));
    },
    /**
     * @param {any} value
     * @param {Element} inputEl
     */
    fillInput(value, inputEl) {
        inputEl.value = value;
        const event = document.createEvent('HTMLEvents');
        event.initEvent('input', false, true);
        inputEl.dispatchEvent(event);
    },
};

export default utils;
