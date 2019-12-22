import ImagePicker from './ImagePicker.js';
import DateTimePicker from './DateTimePicker.js';
import QuillEditor from './QuillEditor.js';

const widgetTypes = [
    {name: 'textField', description: 'Lyhyt tekstikenttä'},
    {name: 'textArea', description: 'Pitkä tekstikenttä'},
    {name: 'richText', description: 'Wysiwyg tekstikenttä'},
    {name: 'image', description: 'Kuva'},
    {name: 'date', description: 'Päivämäärä'},
    {name: 'dateTime', description: 'Päivämäärä ja aika'},
];

const makeTextWidget = tagName =>
    props => $el(tagName, {value: props.field.value,
                           onInput: e => {
                               props.onChange(e.target.value);
                           }});

const makeDateWidget = showTime =>
    props => $el(DateTimePicker, {
        inputName: props.field.name,
        defaultDate: props.field.value ? new Date(props.field.value * 1000) : null,
        onSelect: date => {
            const unixTime = Math.floor(date.getTime() / 1000);
            props.onChange(!props.fieldInfo || props.fieldInfo.datatype === 'int'
                ? unixTime
                : unixTime.toString());
        },
        showTime
    });

const widgetComponents = {
    textField: makeTextWidget('input'),
    textArea: makeTextWidget('textarea'),
    richText: props => $el(QuillEditor, {
        name: `field-${props.field.id}`,
        value: props.field.value,
        onChange: html => {
            props.onChange(html);
        }
    }),
    image: props => $el(ImagePicker, {
        value: props.field.value,
        onChange: src => props.onChange(src)
    }),
    date: makeDateWidget(false),
    dateTime: makeDateWidget(true),
};

/**
 * @param {'textField'|'textArea'|'richText'|'image'|'date'|'dateTime'} type
 */
export default type => {
    const component = widgetComponents[type];
    if (component) return component;
    throw new Error(`${type} not implemented.`);
};

export {widgetTypes};
