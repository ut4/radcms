import {FeatherSvg} from '@rad-commons';
import ContentEditable from './ContentEditable.jsx';

const dataTypes = [{name: 'text', friendlyName: 'Text'},
                   {name: 'json', friendlyName: 'Json'},
                   {name: 'int', friendlyName: 'Integer (signed)'},];

class FieldList extends preact.Component {
    /**
     * @param {{fieldsState: FieldsStore; disallowEditing: boolean; formMode?: 'createForm' | 'editForm';}} props
     */
    constructor(props) {
        super(props);
        this.state = {formMode: props.formMode,
                      editModeIsOn: props.formMode === 'createForm'};
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.editModeIsOn)
            return <StaticFieldList fields={ this.props.fieldsState.getFields() }
                                    disallowEditing={ this.props.disallowEditing }
                                    setEditModeIsOn={ isOn => {
                                        if (this.state.editModeIsOn !== isOn)
                                            this.setState({editModeIsOn: isOn});
                                    } }/>;
        if (this.props.formMode === 'createForm')
            return <FreelyEditableFieldList fieldsState={ this.props.fieldsState }/>;
        //
        return <OneByOneEditableFieldList fields={ this.props.fieldState }/>;
    }
}

class StaticFieldList extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div class="list fields">
            <button onClick={ () => this.props.setEditModeIsOn(true) }
                    title="Muokkaa kenttiä"
                    class="icon-button configure"
                    disabled={ this.props.disallowEditing }>
                <FeatherSvg iconId="settings"/>
            </button>
            { this.props.fields.map(f => <div class="row">
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
        this.fields.store.subscribe(() => {
            this.setState({fields: this.fields.getFields()});
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
            { this.state.fields.map(f => <tr key={ f.name }>
                <td><ContentEditable onChange={ val => this.fields.setProps(f, {name: val}) }
                                     value={ f.name }/></td>
                <td><ContentEditable onChange={ val => this.fields.setProps(f, {friendlyName: val}) }
                                     value={ f.friendlyName }/></td>
                <td><select onChange={ e => this.fields.setProps(f, {dataType: e.target.value}) }
                            value={ f.dataType }>{ dataTypes.map(dt =>
                    <option value={ dt.name }>{ dt.friendlyName }</option>
                ) }</select></td>
                <td><ContentEditable onChange={ val => this.fields.setProps(f, {defaultValue: val}) }
                                     value={ f.defaultValue }/></td>
                <td><ContentEditable onChange={ val => this.fields.setProps(f, {widget: JSON.parse(val)}) }
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
     * @access protected
     */
    render() {
        return <div class="list fields">
            todo
        </div>;
    }
}

export default FieldList;
