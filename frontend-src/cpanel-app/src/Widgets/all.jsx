import {Input, Textarea} from '@rad-commons';
import ImagePicker from './ImagePicker.jsx';
import DateTimePicker from './DateTimePicker.jsx';
import QuillEditor from './QuillEditor.jsx';

const widgetTypes = [
    {name: 'textField', description: 'Lyhyt tekstikenttä', defaultInitialValue: '...'},
    {name: 'textArea', description: 'Pitkä tekstikenttä', defaultInitialValue: '...'},
    {name: 'richText', description: 'Wysiwyg tekstikenttä', defaultInitialValue: '...'},
    {name: 'image', description: 'Kuva', defaultInitialValue: ''},
    {name: 'date', description: 'Päivämäärä', defaultInitialValue: ''},
    {name: 'dateTime', description: 'Päivämäärä ja aika', defaultInitialValue: ''},
    {name: 'color', description: 'Väri', defaultInitialValue: '#33393e'},
];

const makeTextWidget = (Component, attrs = {}) =>
    props => preact.createElement(Component,
        Object.assign({}, {value: props.field.value,
                           onInput: e => {
                               props.onChange(e.target.value);
                           },
                           id: props.field.id}, attrs)
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
    textField: makeTextWidget(Input),
    textArea: makeTextWidget(Textarea),
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
    color: makeTextWidget(Input, {type: 'color'}),
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
