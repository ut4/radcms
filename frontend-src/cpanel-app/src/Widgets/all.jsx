import ImagePicker from './ImagePicker.jsx';
import DateTimePicker from './DateTimePicker.jsx';
import QuillEditor from './QuillEditor.jsx';

const widgetTypes = [
    {name: 'textField', description: 'Lyhyt tekstikenttä'},
    {name: 'textArea', description: 'Pitkä tekstikenttä'},
    {name: 'richText', description: 'Wysiwyg tekstikenttä'},
    {name: 'image', description: 'Kuva'},
    {name: 'date', description: 'Päivämäärä'},
    {name: 'dateTime', description: 'Päivämäärä ja aika'},
    {name: 'color', description: 'Väri'},
];

const makeTextWidget = (tagName, attrs = {}) =>
    props => preact.createElement(tagName,
        Object.assign({}, {value: props.field.value,
                           onInput: e => {
                               props.onChange(e.target.value);
                           }}, attrs)
    );

const makeDateWidget = showTime =>
    props => <DateTimePicker
        inputName={ props.field.name }
        defaultDate={ props.field.value ? new Date(props.field.value * 1000) : null }
        onSelect={ date => {
            const unixTime = Math.floor(date.getTime() / 1000);
            props.onChange(!props.fieldInfo || props.fieldInfo.datatype === 'int'
                ? unixTime
                : unixTime.toString());
        } }
        showTime={ showTime }/>;

const widgetComponents = {
    textField: makeTextWidget('input'),
    textArea: makeTextWidget('textarea'),
    richText: props => <QuillEditor
        name={ `field-${props.field.id}` }
        value={ props.field.value }
        onChange={ html => {
            props.onChange(html);
        } }/>,
    image: props => <ImagePicker
        value={ props.field.value }
        onChange={ src => props.onChange(src) }/>,
    date: makeDateWidget(false),
    dateTime: makeDateWidget(true),
    color: makeTextWidget('input', {type: 'color'}),
};

/**
 * @param {'textField'|'textArea'|'richText'|'image'|'date'|'dateTime'|'color'} type
 */
export default type => {
    const component = widgetComponents[type];
    if (component) return component;
    throw new Error(`${type} not implemented.`);
};

export {widgetTypes};
