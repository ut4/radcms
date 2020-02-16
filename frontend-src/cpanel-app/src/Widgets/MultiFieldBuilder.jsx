import {InputGroup} from '@rad-commons';
import makeWidgetComponent, {widgetTypes} from '../Widgets/all.jsx';

/**
 * Widgetti, jolla voi rakentaa yhteen sisältötyypin kenttään jsonin, jossa on
 * useita erityyppisiä kenttiä. Muistuttaa konseptiltaan Wordpressin Gutenberg-
 * palikkasysteemiä.
 */
class MultiFieldBuilder extends preact.Component {
    /**
     * @param {{enableFieldEditing: boolean; fields: Array<{id: string; type: 'textField'|'textArea'|'richText'|'image'|'date'|'dateTime'; name: string; value: string;}>; onChange: (structure: string, rendered: string) => any;}} props
     */
    constructor(props) {
        super(props);
        this.idCounter = 0;
        if (props.fields.length) {
            this.state = {fields: props.fields};
            this.idCounter = props.fields.reduce((max, p) => p.id > max ? p.id : max, 0);
        } else {
            this.state = {fields: [this.makeField(widgetTypes[0])]};
        }
        this.emitChange();
    }
    /**
     * @access protected
     */
    render() {
        return <div class="multi-field-builder">
            { this.state.fields.map(field => <div>
                <InputGroup key={ field.id }>
                    { preact.createElement(makeWidgetComponent(field.type), {field, onChange: val => {
                        this.emitChange(val, field);
                    }}) }
                    { this.props.enableFieldEditing
                        ? <label onInput={ e => { this.updateFieldName(e.target.textContent, field); } }
                                 contentEditable={ true }
                                 htmlFor={ field.id }>{ field.name }</label>
                        : <label htmlFor={ field.id }>{ field.name }</label>
                    }
                </InputGroup>
            </div>) }
            { this.props.enableFieldEditing
                ? <button onClick={ () => popupDialog.open(() =>
                        <div class="popup-dialog"><div class="box">
                            <div class="main">
                                <h2>Valitse tyyppi</h2>
                                <div class="item-grid">{ widgetTypes.map(w =>
                                    <button onClick={ () => this.addField(w) }
                                            type="button">{ w.description }</button>
                                ) }</div>
                            </div>
                        </div></div>
                    ) }
                    class="nice-button small"
                    type="button">Lisää kenttä</button>
                : null
            }
        </div>;
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
    }
    /**
     * @access private
     */
    makeField(type) {
        return {id: (++this.idCounter).toString(),
                type: type.name,
                name: 'Uusi kenttä',
                value: type.defaultInitialValue};
    }
}

export default MultiFieldBuilder;
