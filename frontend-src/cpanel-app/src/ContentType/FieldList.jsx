import {http, toasters, urlUtils, Form, FeatherSvg} from '@rad-commons';
import ContentEditable from './ContentEditable.jsx';

const dataTypes = [{name: 'text', friendlyName: 'Text'},
                   {name: 'json', friendlyName: 'Json'},
                   {name: 'int', friendlyName: 'Integer (signed)'},
                   {name: 'uint', friendlyName: 'Integer (unsigned)'},];

class FieldList extends preact.Component {
    /**
     * @param {{fieldsState: FieldsStore; editMode: keyof {create: 1, edit: 1, none: 1}; blur: boolean; contentType: Object;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        let Cls = StaticFieldList;
        if (this.props.editMode === 'edit')
            Cls = OneByOneEditableFieldList;
        else if (this.props.editMode === 'create')
            Cls = FreelyEditableFieldList;
        return preact.createElement(Cls, this.props);
    }
}

class StaticFieldList extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div class={ `list fields no-thead${!this.props.blur ? '' : ' blurred'}` }>
            <button onClick={ () => this.props.fieldsState.setEditMode('edit') }
                    title="Muokkaa kenttiä"
                    class="icon-button configure"
                    disabled={ this.props.blur }>
                <FeatherSvg iconId="settings"/>
            </button>
            { this.props.fieldsState.getFields().map(f => <div class="row">
                <div>{ f.name }</div>
                <div>{ f.friendlyName }</div>
                <div>{ f.dataType }</div>
            </div>) }
        </div>;
    }
}

class FreelyEditableFieldList extends preact.Component {
    /**
     * @param {{fieldsState: FieldsStore;}} props
     */
    constructor(props) {
        super(props);
        this.fields = this.props.fieldsState;
        this.state = {fields: this.fields.getFields()};
        this.fields.listen('fields', fields => {
            this.setState({fields});
        });
    }
    /**
     * @access protected
     */
    render() {
        return <div class="list fields"><table>
            <tr>
                <th>#</th>
                <th>Nimi</th>
                <th>Datatyyppi</th>
                <th>Oletusarvo</th>
                <th>Widgetti</th>
                <th class="buttons"></th>
            </tr>
            { this.state.fields.map((f, i) => <tr key={ i.toString() }>
                <td><ContentEditable onChange={ val => this.fields.setFieldProps(f, {name: val}) }
                                     value={ f.name }/></td>
                <td><ContentEditable onChange={ val => this.fields.setFieldProps(f, {friendlyName: val}) }
                                     value={ f.friendlyName }/></td>
                <td><select onChange={ e => this.fields.setFieldProps(f, {dataType: e.target.value}) }
                            value={ f.dataType }>{ dataTypes.map(dt =>
                    <option value={ dt.name }>{ dt.friendlyName }</option>
                ) }</select></td>
                <td><ContentEditable onChange={ val => this.fields.setFieldProps(f, {defaultValue: val}) }
                                     value={ f.defaultValue }/></td>
                <td><ContentEditable onChange={ val => this.fields.setFieldProps(f, {widget: JSON.parse(val)}) }
                                     value={ JSON.stringify(f.widget) }/></td>
                <td class="buttons">
                    <button onClick={ () => this.fields.removeField(f) }
                            title="Poista kenttä"
                            class="nice-button small"
                            disabled={ this.props.disallowEditing || this.state.fields.length < 2 }>
                        Poista
                    </button>
                </td>
            </tr>) }
            <tr><td colSpan="6">
                <button onClick={ () => this.fields.addField() }
                        title="Lisää kenttä"
                        class="nice-button small">
                    Lisää kenttä
                </button>
            </td></tr>
        </table></div>;
    }
}

class OneByOneEditableFieldList extends preact.Component {
    /**
     * @param {Object} props @see FieldList
     */
    constructor(props) {
        super(props);
        this.fields = this.props.fieldsState;
        this.state = {fields: this.fields.getFields(), newFieldIsAppended: false};
        this.fields.listen('fields', fields => {
            this.setState({
                fields,
                newFieldIsAppended: fields.length === this.state.fields.length
                    ? this.state.newFieldIsAppended
                    : fields.length > this.state.fields.length
            });
        });
    }
    /**
     * @access protected
     */
    render() {
        return <div class="list fields">
            <button onClick={ () => this.props.fieldsState.setEditMode('none') }
                    title="Lopeta muokkaus"
                    class="icon-button configure">
                <FeatherSvg iconId="check"/>
            </button>
            <table>
                <tr>
                    <th>#</th>
                    <th>Nimi</th>
                    <th>Datatyyppi</th>
                    <th>Oletusarvo</th>
                    <th>Widgetti</th>
                    <th class="buttons"></th>
                </tr>
                { this.state.fields.map((f, i) =>
                    !this.state.newFieldIsAppended || i !== this.state.fields.length - 1
                        ? <DefaultOneByOneFieldRow
                            field={ f }
                            onDeleteRequested={ () => this.openDeleteFieldDialog(f) }
                            blur={ this.state.newFieldIsAppended }
                            key={ i.toString() }/>
                        : [
                            <NewOneByOneFieldRow
                                field={ f }
                                fieldsState={ this.fields }
                                contentTypeName={ this.props.contentType.name }
                                key={ i.toString() }/>,
                            <tr>
                                <td colSpan="6">
                                <button onClick={ () => this.confirmAddNewField(i) }
                                        class="nice-button primary small">Luo kenttä</button>
                                <span> </span>
                                <button onClick={ () => this.discardAddNewField(i) }
                                        class="nice-button small">Peruuta</button>
                                </td>
                            </tr>
                        ]
                ) }
                { !this.state.newFieldIsAppended
                    ? <tr><td colSpan="6">
                        <button onClick={ () => this.fields.addField() }
                                title="Lisää kenttä"
                                class="nice-button small">
                            Lisää kenttä
                        </button>
                    </td></tr>
                    : null
                }
            </table>
        </div>;
    }
    /**
     * @access private
     */
    confirmAddNewField(i) {
        const f = this.fields.getFields()[i];
        const data = {
            name: f.name,
            friendlyName: f.friendlyName,
            dataType: f.dataType,
            defaultValue: f.defaultValue,
            widget: f.widget,
        };
        http.post(`/api/content-types/field/${this.props.contentType.name}`, data)
            .then(() => {
                urlUtils.reload();
            })
            .catch(() => {
                toasters.main('Kentän lisäys sisältötyyppiin epäonnistui.', 'error');
            });
    }
    /**
     * @access private
     */
    discardAddNewField(i) {
        const f = this.fields.getFields()[i];
        this.fields.removeField(f);
    }
    /**
     * @access private
     */
    openDeleteFieldDialog(field) {
        popupDialog.open(DeleteFieldDialog, {
            field,
            contentTypeFriendlyName: this.props.contentType.friendlyName,
            onConfirm: () => {
            http.delete('/api/content-types/field/' + this.props.contentType.name +
                                                '/' + field.name)
                .then(() => {
                    urlUtils.reload();
                })
                .catch(() => {
                    toasters.main('Kentän poisto sisältötyypistä epäonnistui.', 'error');
                });
            }
        });
    }
}

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
    render() {
        return <div class="popup-dialog"><div class="box">
            <Form onConfirm={ () => this.handleConfirm() }
                usePseudoFormTag={ true }
                confirmButtonText="Poista kenttä"
                onCancel={ () => this.handleCancel() }
                autoClose={ false }>
            <h2>Poista sisältötyyppi</h2>
            <div class="main">
                <p>Poista kenttä &quot;{ this.props.field.friendlyName }&quot; ({ this.props.field.name }) sisältötyypistä &quot;{ this.props.contentTypeFriendlyName }&quot; pysyvästi?</p>
            </div>
        </Form></div></div>;
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

class DefaultOneByOneFieldRow extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <tr class={ !this.props.blur ? '' : ' blurred' }>
            <td>{ this.props.field.name }</td>
            <td>{ this.props.field.friendlyName }</td>
            <td>{ this.props.field.dataType }</td>
            <td>{ this.props.field.defaultValue || '(tyhjä)' }</td>
            <td>{ JSON.stringify(this.props.field.widget) }</td>
            <td class="buttons">
                <button class="icon-button"
                        disabled={ this.props.blur }>
                    <FeatherSvg iconId="edit-2" className="small"/>
                </button>
                <span> </span>
                <button class="icon-button"
                        disabled={ this.props.blur }
                        onClick={ () => this.props.onDeleteRequested() }>
                    <FeatherSvg iconId="x" className="small"/>
                </button>
            </td>
        </tr>;
    }
}

class NewOneByOneFieldRow extends preact.Component {
    /**
     * @access protected
     */
    render() {
        const f = this.props.field;
        const fieldsState = this.props.fieldsState;
        return <tr>
            <td><ContentEditable onChange={ val => fieldsState.setFieldProps(f, {name: val}) }
                                 value={ f.name }/></td>
            <td><ContentEditable onChange={ val => fieldsState.setFieldProps(f, {friendlyName: val}) }
                                 value={ f.friendlyName }/></td>
            <td><select onChange={ e => fieldsState.setFieldProps(f, {dataType: e.target.value}) }
                        value={ f.dataType }>{ dataTypes.map(dt =>
                <option value={ dt.name }>{ dt.friendlyName }</option>
            ) }</select></td>
            <td><ContentEditable onChange={ val => fieldsState.setFieldProps(f, {defaultValue: val}) }
                                 value={ f.defaultValue }/></td>
            <td><ContentEditable onChange={ val => fieldsState.setFieldProps(f, {widget: JSON.parse(val)}) }
                                 value={ JSON.stringify(f.widget) }/></td>
            <td class="buttons"></td>
        </tr>;
    }
}

export default FieldList;
