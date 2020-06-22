import AbstractSettingEditForm from '../AbstractSettingEditForm.jsx';
import ColorPickerFieldWidget from './ColorPicker.jsx';

/**
 * Komponentti, jolla devaaja voi konfiguroida värivalitsimen asetukset.
 */
class ColorPickerSettingsEditForm extends AbstractSettingEditForm {
    /**
     * @param {{settings: {defaultColor: string;}|null;}} props
     */
    constructor(props) {
        super(props);
        this.fieldId = 'colorPickerSetting-defaultColor';
        this.color = props.settings ? props.settings.defaultColor : '#637286';
    }
    /**
     * @returns {{defaultColor: string;}}
     * @access public
     */
    getResult() {
        return {defaultColor: this.color};
    }
    /**
     * @access protected
     */
    render() {
        return <>
            <ColorPickerFieldWidget
                field={ {name: this.fieldId, friendlyName: 'Oletusväri'} }
                initialValue={ this.color }
                onValueChange={ color => { this.color = color; } }/>
        </>;
    }
}

export default ColorPickerSettingsEditForm;
