import {Confirmation, InputGroup, Input, hookForm, Select} from '@rad-commons';
import popupDialog from '../Common/PopupDialog.jsx';
import {widgetTypes} from '../Content/FieldWidgets/all-with-multi.js';
import WidgetSelector from '../Content/WidgetSelector.jsx';

const dataTypes = [{name: 'text', friendlyName: 'Text'},
                   {name: 'json', friendlyName: 'Json'},
                   {name: 'int',  friendlyName: 'Integer (signed)'},
                   {name: 'uint', friendlyName: 'Integer (unsigned)'},];

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

class FieldInputs extends preact.Component {
    /**
     * @param {{field: ContentTypeField;}} props
     */
    constructor(props) {
        super(props);
        this.state = hookForm(this, {
            name: props.field.name,
            friendlyName: props.field.friendlyName,
            dataType: props.field.dataType,
            defaultValue: props.field.defaultValue,
            visibility: props.field.visibility,
        });
        this.widgetSelector = preact.createRef();
    }
    /**
     * @access protected
     */
    render() {
        return <div class="main">
            <InputGroup>
                <label htmlFor="name" class="form-label">Nimi</label>
                <Input vm={ this } name="name" id="name"/>
            </InputGroup>
            <InputGroup>
                <label htmlFor="friendlyName" class="form-label">Selkonimi</label>
                <Input vm={ this } name="friendlyName" id="friendlyName"/>
            </InputGroup>
            <InputGroup>
                <label htmlFor="dataType" class="form-label">Datatyyppi</label>
                <Select vm={ this } name="dataType" id="dataType">{ dataTypes.map(dt =>
                    <option value={ dt.name }>{ dt.friendlyName }</option>
                ) }</Select>
            </InputGroup>
            <InputGroup>
                <label htmlFor="defaultValue" class="form-label">Oletusarvo</label>
                <Input vm={ this } name="defaultValue" id="defaultValue"/>
            </InputGroup>
            <InputGroup>
                <label htmlFor="visibility" class="form-label">Näkyvyys
                    <div class="note">Käyttäjäroolit joille kenttä näytetään</div>
                </label>
                <Select vm={ this } name="visibility" id="visibility">
                    <option value={ 0 }>Kaikki</option>
                </Select>
            </InputGroup>
            <WidgetSelector
                widget={ this.props.field.widget }
                widgetTypes={ widgetTypes }
                ref={ this.widgetSelector }
                includeMultiField/>
        </div>;
    }
    /**
     * @access public
     */
    getValues() {
        const values = this.state.values;
        return {
            name: values.name,
            friendlyName: values.friendlyName,
            dataType: values.dataType,
            defaultValue: values.defaultValue,
            visibility: values.visibility,
            widget: this.widgetSelector.current.getResult()
        };
    }
}

export {CreateFieldDialog, EditFieldDialog, DeleteFieldDialog};
