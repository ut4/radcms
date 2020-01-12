import makeWidgetComponent, {widgetTypes} from '../Widgets/all.js';
import {components} from '../../../rad-commons.js';
const {InputGroup} = components;

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
        this.idCounter = 0;
        if (props.fields.length) {
            this.state = {fields: props.fields};
            this.idCounter = props.fields.reduce((max, p) => p.id > max ? p.id : max, 0);
        } else {
            this.state = {fields: [this.makeField(widgetTypes[0].name)]};
        }
        this.emitChange();
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', {className: 'multi-field-builder'},
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
            $el('button', {onClick: () => popupDialog.open(() =>
                                $el('div', {className: 'popup-dialog'}, $el('div', {className: 'box'},
                                    $el('div', {className: 'main'},
                                        $el('h2', null, 'Valitse tyyppi'),
                                        $el('div', {className: 'item-grid'}, widgetTypes.map(w =>
                                            $el('button', {onClick: () => this.addField(w.name),
                                                           type: 'button'}, w.description)
                                        ))
                                    )
                                ))),
                           className: 'nice-button small',
                           type: 'button'},
                'Lisää kenttä')
        );
    }
    /**
     * @access private
     */
    addField(type) {
        this.state.fields.push(this.makeField(type));
        this.setState({fields: this.state.fields});
        popupDialog.close();
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
    /**
     * @access private
     */
    makeField(type) {
        return {id: (++this.idCounter).toString(), type, name: 'Uusi kenttä', value: '...'};
    }
}

export default MultiFieldBuilder;
