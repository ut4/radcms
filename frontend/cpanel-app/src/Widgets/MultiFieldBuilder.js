import makeWidgetComponent, {widgetTypes} from '../Widgets/all.js';
import {components} from '../../../rad-commons.js';
const {InputGroup} = components;

let idCounter = 0;

/**
 * Widgetti, jolla voi rakentaa yhteen sisältötyypin kenttään jsonin, jossa on
 * useita erityyppisiä kenttiä. Muistuttaa konseptiltaan Wordpressin Gutenberg-
 * palikkasysteemiä.
 */
class MultiFieldBuilder extends preact.Component {
    /**
     * @param {{fields: Array<{id: string; type: 'textField'|'textArea'|'richText'|'image'|'date'|'dateTime'; name: string; value: string;}>; onChange: (structure: string, rendered: string) => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {
            addFieldDialogIsOpen: false,
            fields: props.fields.length ? props.fields : [makeField(widgetTypes[0].name)]
        };
        this.emitChange();
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null,
            this.state.fields.map(field => $el('div', null,
                $el(InputGroup,
                    {label: _props =>
                        $el('div', {onInput: e => { this.updateFieldName(e.target.textContent, field); },
                                    contentEditable: true}, field.name)},
                    $el(makeWidgetComponent(field.type), {field, key: field.id, onChange: val => {
                        this.emitChange(val, field);
                    }})
                )
            )),
            !this.state.addFieldDialogIsOpen
                ? $el('button', {onClick: () => this.setState({addFieldDialogIsOpen: true}),
                                 type: 'button'}, 'Lisää kenttä')
                : $el('div', {className: 'popup-dialog-dialog'}, $el('div', {className: 'box'},
                    $el('div', {className: 'main'}, $el('div', {className: 'item-list'},
                        widgetTypes.map(w =>
                            $el('button', {onClick: () => this.addField(w.name),
                                           type: 'button'}, w.description)
                        )
                    ))
                ))
        );
    }
    /**
     * @access private
     */
    addField(type) {
        this.state.fields.push(makeField(type));
        this.setState({fields: this.state.fields, addFieldDialogIsOpen: false});
        this.emitChange();
    }
    /**
     * @access private
     */
    emitChange(newValue = null, field = null) {
        if (newValue !== null) {
            field.value = newValue;
            this.setState({fields: this.state.fields});
        }
        this.props.onChange(JSON.stringify(this.state.fields),
                            this.state.fields.map(field => field.value).join(''));
    }
    /**
     * @access private
     */
    updateFieldName(val, field) {
        field.name = val;
        this.setState({fields: this.state.fields});
    }
}

function makeField(type) {
    return {id: (++idCounter).toString(), type, name: 'Uusi kenttä', value: '...'};
}

export default MultiFieldBuilder;
