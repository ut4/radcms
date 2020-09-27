import {Confirmation, InputGroup, Input, hookForm, Select, InputError} from '@rad-commons';
import popupDialog from '../Common/PopupDialog.jsx';
import {widgetTypes} from '../Content/FieldWidgets/all-with-multi.js';
import WidgetSelector from '../Content/WidgetSelector.jsx';

/**
 * Popup-dialog, jolla devaaja voi konfiguroida uuden sisältötyyppikentän tiedot.
 */
class CreateFieldDialog extends preact.Component {
    /**
     * @param {{field: ContentTypeField;}} props
     */
    constructor(props) {
        super(props);
        this.fieldInputs = preact.createRef();
    }
    /**
     * @access protected
     */
    render({field}) {
        return <div class="popup-dialog"><div class="box">
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Lisää kenttä"
                onCancel={ () => this.handleCancel() }>
            <h2>Lisää kenttä</h2>
            <FieldInputs field={ field } ref={ this.fieldInputs }/>
        </Confirmation></div></div>;
    }
    /**
     * @access private
     */
    handleConfirm() {
        this.props.onConfirm(this.fieldInputs.current.getValues(),
                             this.props.field);
        this.handleCancel();
    }
    /**
     * @access private
     */
    handleCancel() {
        popupDialog.close();
    }
}

/**
 * Popup-dialog, jolla devaaja voi konfiguroida sisältötyyppikentän tiedot.
 */
class EditFieldDialog extends preact.Component {
    /**
     * @param {{field: ContentTypeField;}} props
     */
    constructor(props) {
        super(props);
        this.fieldInputs = preact.createRef();
    }
    /**
     * @access protected
     */
    render({field}) {
        return <div class="popup-dialog"><div class="box">
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Tallenna kenttä"
                onCancel={ () => this.handleCancel() }>
            <h2>Muokkaa kenttää</h2>
            <FieldInputs field={ field } ref={ this.fieldInputs }/>
        </Confirmation></div></div>;
    }
    /**
     * @access private
     */
    handleConfirm() {
        const values = this.fieldInputs.current.getValues();
        if (!values) // invalid
            return;
        this.props.onConfirm(values,
                             this.props.field);
        this.handleCancel();
    }
    /**
     * @access private
     */
    handleCancel() {
        popupDialog.close();
    }
}

/**
 * Popup-dialog joka näytetään devaajalle silloin, kun poistetaan olemassaolevan
 * sisältötyypin kenttää.
 */
class DeleteFieldDialog extends preact.Component {
    /**
     * @param {{field: ContentTypeField; contentTypeFriendlyName: string;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render({field, contentTypeFriendlyName}) {
        return <div class="popup-dialog"><div class="box">
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Poista kenttä"
                onCancel={ () => this.handleCancel() }>
            <h2>Poista kenttä</h2>
            <div class="main">
                <p>Poista kenttä &quot;{ field.friendlyName }&quot; ({ field.name }) sisältötyypistä &quot;{ contentTypeFriendlyName }&quot; pysyvästi?</p>
            </div>
        </Confirmation></div></div>;
    }
    /**
     * @access private
     */
    handleConfirm() {
        this.props.onConfirm();
        this.handleCancel();
    }
    /**
     * @access private
     */
    handleCancel() {
        popupDialog.close();
    }
}

const dataTypes = [{name: 'text', friendlyName: 'Text'},
                   {name: 'json', friendlyName: 'Json'},
                   {name: 'int',  friendlyName: 'Integer (signed)'},
                   {name: 'uint', friendlyName: 'Integer (unsigned)'},];

const roles = [{name: 'Super-admin', flag: 1 << 0},
               {name: 'Editor',      flag: 1 << 1},
               {name: 'Author',      flag: 1 << 2},
               {name: 'Contributor', flag: 1 << 3}];
const VISIBILITY_ALL = roles.reduce((mask, role) => mask | role.flag, 0);

class FieldInputs extends preact.Component {
    /**
     * @param {{field: ContentTypeField;}} props
     */
    constructor(props) {
        super(props);
        const isVisibleForAll = props.field.visibility < 1;
        this.state = Object.assign({
            visibility: isVisibleForAll ? VISIBILITY_ALL : props.field.visibility,
            allVisibilitiesChecked: isVisibleForAll,
            showVisibilityError: false,
        }, hookForm(this, {
            name: props.field.name,
            friendlyName: props.field.friendlyName,
            dataTypeType: props.field.dataType.type,
            dataTypeLength: props.field.dataType.length || '',
            defaultValue: props.field.defaultValue,
        }));
        this.widgetSelector = preact.createRef();
    }
    /**
     * @returns {Object|null}
     * @access public
     */
    getValues() {
        if (!this.form.handleSubmit() || this.state.visibility < 1) {
            this.setState({showVisibilityError: true});
            return null;
        }
        const values = this.state.values;
        const {visibility} = this.state;
        return {
            name: values.name,
            friendlyName: values.friendlyName,
            dataType: {type: values.dataTypeType,
                       length: values.dataTypeType !== 'json' ? parseInt(values.dataTypeLength) : null},
            defaultValue: values.defaultValue,
            visibility: visibility !== VISIBILITY_ALL ? visibility : 0,
            widget: this.widgetSelector.current.getResult()
        };
    }
    /**
     * @access protected
     */
    render() {
        const {classes, errors} = this.state;
        return <div class="main">
            <InputGroup classes={ classes.name }>
                <label htmlFor="name" class="form-label">Nimi</label>
                <Input vm={ this } name="name" id="name" validations={ [['required']] }
                    errorLabel="Nimi"/>
                <InputError error={ errors.name }/>
            </InputGroup>
            <InputGroup classes={ classes.friendlyName }>
                <label htmlFor="friendlyName" class="form-label">Selkonimi</label>
                <Input vm={ this } name="friendlyName" id="friendlyName" validations={ [['required']] }
                    errorLabel="Selkonimi"/>
                <InputError error={ errors.friendlyName }/>
            </InputGroup>
            <InputGroup classes={ classes.dataTypeLength }>
                <label htmlFor="dataTypeType" class="form-label">Datatyyppi</label>
                <div class="input-group">
                <Select vm={ this } name="dataTypeType" id="dataTypeType">{ dataTypes.map(dt =>
                    <option value={ dt.name }>{ dt.friendlyName }</option>
                ) }</Select>
                <Input vm={ this } disabled={ this.state.values.dataTypeType === 'json' }
                    name="dataTypeLength" id="dataTypeLength" placeholder="Pituus (esim. 64)"
                    validations={ [['regexp', '^([1-9]([0-9])*)*$']] } errorLabel="Pituus"/>
                </div>
                <InputError error={ errors.dataTypeLength }/>
            </InputGroup>
            <InputGroup>
                <label htmlFor="defaultValue" class="form-label">Oletusarvo</label>
                <Input vm={ this } name="defaultValue" id="defaultValue"/>
            </InputGroup>
            <div class="indented-content mt-8">
                <div class="form-label">Näkyvyys
                    <div class="note">Käyttäjäroolit joille kenttä näytetään</div>
                </div>
                <div class="item-grid checkbox-grid">
                    <div class="bg-light" style="grid-column: 1/2"><label class="form-checkbox">
                        <input type="checkbox" checked={ this.state.allVisibilitiesChecked }
                            onChange={ e => this.toggleIsVisibleForAll(e) }/>
                        <i class="form-icon"></i> Kaikki
                    </label></div>
                    <div style="grid-column: 2/5"></div>
                    { roles.map(role => <div class="bg-light"><label class="form-checkbox">
                        <input type="checkbox"
                            checked={ this.state.visibility & role.flag }
                            onChange={ e => this.toggleIsVisibleForRole(e, role) }/>
                        <i class="form-icon"></i> { role.name }
                    </label></div>) }
                </div>
                { !this.state.showVisibilityError || this.state.visibility ? null : <div class="has-error mt-2">
                    <InputError error="Ainakin yksi rooli vaaditaan"/>
                </div> }
            </div>
            <WidgetSelector
                widget={ this.props.field.widget }
                widgetTypes={ widgetTypes }
                ref={ this.widgetSelector }
                includeMultiField/>
        </div>;
    }
    /**
     * @access private
     */
    toggleIsVisibleForRole(e, role) {
        this.setState({showVisibilityError: false,
                       visibility: e.target.checked
                           ? this.state.visibility | role.flag
                           : this.state.visibility & ~role.flag});
    }
    /**
     * @access private
     */
    toggleIsVisibleForAll(e) {
        const allVisibilitiesChecked = e.target.checked;
        this.setState({allVisibilitiesChecked,
                       showVisibilityError: false,
                       visibility: allVisibilitiesChecked ? VISIBILITY_ALL : 0});
    }
}

export {CreateFieldDialog, EditFieldDialog, DeleteFieldDialog};
