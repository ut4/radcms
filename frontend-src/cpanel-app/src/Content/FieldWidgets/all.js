import TextFieldFieldWidget from './TextField.jsx';
import TextAreaFieldFieldWidget from './TextArea.jsx';
import RichTextFieldWidget from './RichText.jsx';
import ImagePickerFieldWidget from './ImagePicker.jsx';
import DateTimePickerFieldWidget from './DateTimePicker.jsx';
import ColorPickerFieldWidget from './ColorPicker/ColorPicker.jsx';
import ContentSelectorFieldWidget from './ContentSelector/ContentSelector.jsx';
import ColorPickerSettingsEditForm from './ColorPicker/ColorPickerSettingsEditForm.jsx';
import ContentSelectorSettingsEditForm from './ContentSelector/ContentSelectorSettingsEditForm.jsx';

const impls = {
    textField: TextFieldFieldWidget,
    textArea: TextAreaFieldFieldWidget,
    richText: RichTextFieldWidget,
    imagePicker: ImagePickerFieldWidget,
    dateTimePicker: DateTimePickerFieldWidget,
    colorPicker: ColorPickerFieldWidget,
    contentSelector: ContentSelectorFieldWidget,
    hidden: () => null,
};

const settingFormImpls = {
    textField: null,
    textArea: null,
    richText: null,
    imagePicker: null,
    dateTimePicker: null,
    colorPicker: ColorPickerSettingsEditForm,
    contentSelector: ContentSelectorSettingsEditForm,
    hidden: null,
};

const widgetTypes = [
    {name: 'textField', friendlyName: 'Lyhyt tekstikenttä', description: 'Lyhyt tekstikenttä'},
    {name: 'textArea', friendlyName: 'Pitkä tekstikenttä', description: 'Pitkä tekstikenttä'},
    {name: 'richText', friendlyName: 'Wysiwyg-tekstikenttä', description: 'Wysiwyg-tekstikenttä'},
    {name: 'imagePicker', friendlyName: 'Kuva', description: 'Kuva'},
    {name: 'datePicker', friendlyName: 'Päivämäärä', description: 'Päivämäärä'},
    {name: 'dateTimePicker', friendlyName: 'Päivämäärä ja aika', description: 'Päivämäärä ja aika'},
    {name: 'colorPicker', friendlyName: 'Väri', description: 'Väri'},
    {name: 'contentSelector', friendlyName: 'Sisältövalitsin', description: 'Sisällön valitsin'},
    {name: 'hidden', friendlyName: 'Piilotettu kenttä', description: 'Piilotettu kenttä'},
];

/**
 * @param {'textField'|'textArea'|'richText'|'imagePicker'|'datePicker'|'dateTimePicker'|'colorPicker'|'contentSelector'|'hidden'} widgetName
 * @returns {{ImplClass: Object; props: Object;}}
 * @throws {Error}
 */
export default widgetName => {
    let props = null;
    if (widgetName === 'dateTimePicker') {
        props = {showTime: true};
    } else if (widgetName === 'datePicker') {
        widgetName = 'dateTimePicker';
        props = {showTime: false};
    } else if (widgetName === 'textArea') {
        props = {autosize: true};
    }
    const ImplClass = impls[widgetName];
    if (ImplClass) return {ImplClass, props};
    throw new Error(`Widget ${widgetName} not implemented.`);
};

/**
 * @param {'textField'|'textArea'|'richText'|'imagePicker'|'datePicker'|'dateTimePicker'|'colorPicker'|'contentSelector'|'hidden'} widgetName
 * @returns {preact.ComponentClass|null}
 */
function getSettingsEditForm(widgetName) {
    return settingFormImpls[widgetName] || null;
}

export {widgetTypes, getSettingsEditForm};
