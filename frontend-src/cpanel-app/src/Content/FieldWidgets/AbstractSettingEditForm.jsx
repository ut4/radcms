
/**
 * Rajapinta komponentille, jolla devaaja voi konfiguroida monikenttäkenttäwid-
 * getin asetukset (widget.args).
 */
class AbstractSettingEditForm extends preact.Component {
    /**
     * @returns {{[key: string]: any;}}
     * @access public
     */
    getResult() {
        throw new Error('Abstract method not implemented.');
    }
}

export default AbstractSettingEditForm;
