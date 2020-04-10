import TextFieldFieldWidget from './TextField.jsx';
import TextAreaFieldFieldWidget from './TextArea.jsx';
import RichTextFieldWidget from './RichText.jsx';
import ImagePickerFieldWidget from './ImagePicker.jsx';
import DateTimePickerFieldWidget from './DateTimePicker.jsx';
import ColorPickerFieldWidget from './ColorPicker.jsx';
import ContentSelectorFieldWidget from './ContentSelector.jsx';

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

const widgetTypes = [
    {name: 'textField', description: 'Lyhyt tekstikenttä'},
    {name: 'textArea', description: 'Pitkä tekstikenttä'},
    {name: 'richText', description: 'Wysiwyg-tekstikenttä'},
    {name: 'imagePicker', description: 'Kuva'},
    {name: 'datePicker', description: 'Päivämäärä'},
    {name: 'dateTimePicker', description: 'Päivämäärä ja aika'},
    {name: 'colorPicker', description: 'Väri'},
    {name: 'contentSelector', description: 'Sisällön valitsin'},
    {name: 'hidden', description: 'Piilotettu kenttä'},
];

/**
 * @param {'textField'|'textArea'|'richText'|'imagePicker'|'datePicker'|'dateTimePicker'|'colorPicker'|'contentSelector'|'hidden'} type
 * @returns {Object}
 * @throws {Error}
 */
export default widgetName => {
    let props = null;
    if (widgetName === 'dateTimePicker') {
        props = {showTime: true};
    } else if (widgetName === 'datePicker') {
        widgetName = 'dateTimePicker';
        props = {showTime: false};
    }
    const ImplClass = impls[widgetName];
    if (ImplClass) return {ImplClass, props};
    throw new Error(`Widget ${widgetName} not implemented.`);
};

export {widgetTypes};
