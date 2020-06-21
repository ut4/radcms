import {hookForm, InputGroup, Input, Select, InputError, FormConfirmation, Confirmation, FeatherSvg} from '@rad-commons';
import popupDialog from '../../../Common/PopupDialog.jsx';
import {widgetTypes, getSettingsEditForm} from '../all.js';

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
        props.fields.listen(fields => {
            this.setState({fields});
        });
    }
    /**
     * @access protected
     */
    render() {
        return <div class="multi-field-configurer">
            <table class="table mb-2">
                <thead><tr>
                    <th>Nimi</th>
                    <th>Widgetti</th>
                    <th>Widgetin asetukset</th>
                    <th class="buttons"></th>
                </tr></thead>
                <tbody>{ this.state.fields.map(f => <tr key={ f.id }>
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
                            <FeatherSvg iconId="edit-2" className="feather-small"/>
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
                            <FeatherSvg iconId="x" className="feather-small"/>
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
        this.settingEditForm = preact.createRef();
        this.state = hookForm(this, {
            fieldName: props.field.name,
            widgetName: props.field.widget.name,
        });
    }
    /**
     * @access protected
     */
    render() {
        const {classes, errors} = this.state;
        const WidgetSettingsForm = getSettingsEditForm(this.state.values.widgetName);
        return <div class="popup-dialog"><div class="box">
            <FormConfirmation
                onConfirm={ e => this.handleConfirm(e) }
                onCancel={ () => { popupDialog.close(); } }
                confirmButtonText="Tallenna">
            <h2>Muokkaa kenttää</h2>
            <div class="main">
                <InputGroup classes={ classes.fieldName }>
                    <label htmlFor="fieldName">Nimi</label>
                    <Input vm={ this } name="fieldName" id="fieldName"
                        validations={ [['required']] }
                        errorLabel="Nimi"/>
                    <InputError error={ errors.fieldName }/>
                </InputGroup>
                <InputGroup>
                    <label>Widgetti</label>
                    <Select vm={ this } name="widgetName">{ widgetTypes.map(w =>
                        <option value={ w.name }>{ w.friendlyName }</option>
                    ) }</Select>
                </InputGroup>
                { !WidgetSettingsForm ? null : <WidgetSettingsForm
                    settings={ this.state.values.widgetName !== this.props.field.widget.name
                        ? null // Käytä oletuksia
                        : this.props.field.widget.args }
                    ref={ this.settingEditForm }/>
                }
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
        this.props.onConfirm({
            name: this.state.values.fieldName,
            widget: {
                name: this.state.values.widgetName,
                args: !this.settingEditForm.current ? this.props.field.widget.args
                    : this.settingEditForm.current.getResult(),
            },
        });
        popupDialog.close();
    }
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
