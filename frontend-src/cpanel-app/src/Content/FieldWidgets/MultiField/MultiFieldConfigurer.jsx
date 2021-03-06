import {hookForm, InputGroup, Input, InputError, FormConfirmation, Confirmation,
        Sortable, FeatherSvg} from '@rad-commons';
import popupDialog from '../../../Common/PopupDialog.jsx';
import {widgetTypes} from '../all.js';
import WidgetSelector from '../../WidgetSelector.jsx';

/**
 * Komponentti, jolla devaaja voi rakentaa multiField-sisällön rakenteen i.e.
 * sisällön sisältämät kentät, ja niiden järjestyksen.
 */
class MultiFieldConfigurer extends preact.Component {
    /**
     * @param {{fields: MultiFieldFieldsStore;}} props
     */
    constructor(props) {
        super(props);
        this.state = {fields: props.fields.getFields()};
        props.fields.listen(fields => this.setState({fields}));
        this.sortable = new Sortable();
    }
    /**
     * @access protected
     */
    render() {
        return <div class="multi-field-configurer">
            <table class="table mb-2">
                <thead><tr>
                    <th class="drag-column"></th>
                    <th>Nimi</th>
                    <th>Widgetti</th>
                    <th>Widgetin asetukset</th>
                    <th class="buttons"></th>
                </tr></thead>
                <tbody ref={ this.activateSorting.bind(this) }>{ this.state.fields.map(f => <tr key={ f.id } data-id={ f.id }>
                    <td class="drag-column">
                        <button class="drag-handle" type="button"><FeatherSvg iconId="grid-dots"/></button>
                    </td>
                    <td>{ f.name }</td>
                    <td>{ widgetTypes.find(w => w.name === f.widget.name).friendlyName }</td>
                    <td>{ formatWidgetArgs(f.widget.args) }</td>
                    <td class="buttons">
                        <button
                            class="btn btn-icon"
                            disabled={ this.props.blur }
                            onClick={ () => popupDialog.open(MultiFieldFieldEditDialog, {
                                field: f,
                                onConfirm: newData => {
                                    this.props.fields.setFieldProps(f.id, newData);
                                }
                            }) }
                            type="button">
                            <FeatherSvg iconId="edit-2" className="feather-sm"/>
                        </button>
                        <button
                            class="btn btn-icon"
                            disabled={ this.props.blur }
                            onClick={ () => popupDialog.open(MultiFieldFieldDeleteDialog, {
                                fieldName: f.name,
                                onConfirm: () => {
                                    this.props.fields.removeField(f.id);
                                }
                            }) }
                            type="button">
                            <FeatherSvg iconId="x" className="feather-sm"/>
                        </button>
                    </td>
                </tr>) }</tbody>
            </table>
            <button
                onClick={ () => this.props.fields.addField(widgetTypes[0]) }
                class="btn btn-sm mt-2"
                type="button">Lisää kenttä</button>
        </div>;
    }
    /**
     * @access private
     */
    activateSorting(tbodyEl) {
        this.sortable.register(tbodyEl, {
            handle: '.drag-handle',
            onReorder: orderedIds => this.props.fields.reorder(orderedIds),
        });
    }
}

function formatWidgetArgs(args) {
    const out = [];
    for (const key in args)
        out.push(`${key} = ${args[key]}`);
    const truncated = out.join(',').substr(0, 32);
    return `${truncated}${truncated.length < 32 ? '' : '...'}`;
}

class MultiFieldFieldEditDialog extends preact.Component {
    /**
     * @param {{field: MultiFieldField; onConfirm: (newData: Object) => any;}} props
     */
    constructor(props) {
        super(props);
        this.widgetSelector = preact.createRef();
        this.state = hookForm(this, {fieldName: props.field.name});
    }
    /**
     * @access protected
     */
    render({field}) {
        const {classes, errors} = this.state;
        return <div class="popup-dialog"><div class="box">
            <FormConfirmation
                onConfirm={ e => this.handleConfirm(e) }
                onCancel={ () => { popupDialog.close(); } }
                confirmButtonText="Tallenna">
            <h2>Muokkaa kenttää</h2>
            <div class="main">
                <InputGroup classes={ classes.fieldName }>
                    <label htmlFor="fieldName" class="form-label">Nimi</label>
                    <Input vm={ this } name="fieldName" id="fieldName"
                        validations={ [['required']] }
                        errorLabel="Nimi"/>
                    <InputError error={ errors.fieldName }/>
                </InputGroup>
                <WidgetSelector widget={ field.widget } ref={ this.widgetSelector }/>
            </div>
            </FormConfirmation>
        </div></div>;
    }
    /**
     * @access private
     */
    handleConfirm(e) {
        if (!this.form.handleSubmit(e))
            return;
        const current = this.props.field.widget;
        const widget = this.widgetSelector.current.getResult();
        this.props.onConfirm({
            name: this.state.values.fieldName,
            widget,
            value: widget.name !== current.name ||
                (widget.name === 'contentSelector' &&
                 !objectsEquals(widget.args, current.args))
                ? ''
                : this.props.field.value,
        });
        popupDialog.close();
    }
}

function objectsEquals(a, b) {
    const sortBeKey = o => Object.keys(o).sort().reduce((s, key) => {
        s[key] = o[key];
        return s;
    }, {});
    return JSON.stringify(sortBeKey(a)) === JSON.stringify(sortBeKey(b));
}

class MultiFieldFieldDeleteDialog extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div class="popup-dialog"><div class="box">
            <Confirmation
                onConfirm={ () => { this.props.onConfirm(); popupDialog.close(); } }
                onCancel={ () => { popupDialog.close(); } }
                confirmButtonText="Poista">
            <h2>Poista kenttä</h2>
            <div class="main">
                <p>Poista monikenttäsisällön kenttä { this.props.fieldName }?</p>
            </div>
        </Confirmation></div></div>;
    }
}

export default MultiFieldConfigurer;
