import {http, toasters, config, urlUtils, FeatherSvg, services} from '@rad-commons';
import popupDialog from '../Common/PopupDialog.jsx';
import {widgetTypes} from '../Content/FieldWidgets/all-with-multi.js';
import {CreateFieldDialog, EditFieldDialog, DeleteFieldDialog} from './FieldDialogs.jsx';

class StaticFieldList extends preact.Component {
    /**
     * @access protected
     */
    render({fields, blur}) {
        return <div class="mt-2">
            <button onClick={ () => this.props.setEditMode('edit') }
                    title="Muokkaa rakennetta"
                    class="btn btn-icon btn-sm with-icon"
                    disabled={ blur }>
                <FeatherSvg iconId="settings" className="feather-sm"/> Muokkaa rakennetta
            </button>
            <div class={ `mt-2 container ${!blur ? '' : ' blurred'}` }>
                <div class="columns panel bg-alt-light mt-2">{ fields.map(f => [
                    <div class="col-3 text-ellipsis">{ f.name }</div>,
                    <div class="col-4 text-ellipsis">{ f.friendlyName }</div>,
                    <div class="col-5 text-ellipsis">{ widgetTypes.find(t => t.name === f.widget.name).friendlyName }</div>
                ]) }</div>
            </div>
        </div>;
    }
}

class FreelyEditableFieldList extends preact.Component {
    /**
     * @param {{fields: Array<ContentTypeField>; blur: boolean;}} props
     */
    constructor(props) {
        super(props);
        this.state = {fields: props.fields.slice(0)};
    }
    /**
     * @returns {Array<ContentTypeField>}
     * @access public
     */
    getFields() {
        return this.state.fields;
    }
    /**
     * @access protected
     */
    render({blur}, {fields}) {
        return <FieldsTable
            fields={ fields }
            onAddButtonClicked={ () => this.addField() }
            onEditButtonClicked={ f => popupDialog.open(EditFieldDialog, {
                field: f,
                onConfirm: newData => {
                    this.updateField(f, newData);
                }
            }) }
            onRemoveButtonClicked={ f => this.removeField(f) }
            blur={ blur }/>;
    }
    /**
     * @access private
     */
    addField() {
        this.setState({fields: this.state.fields.concat(makeField())});
    }
    /**
     * @access private
     */
    updateField(field, data) {
        this.setState({fields: this.state.fields.map(field2 => field2.key !== field.key
            ? field2
            : Object.assign({}, field2, data))
        });
    }
    /**
     * @access private
     */
    removeField(field) {
        this.setState({fields: this.state.fields.filter(field2 => field2.name !== field.name)});
    }
}

class OneByOneEditableFieldList extends preact.Component {
    /**
     * @param {{fields: Array<ContentTypeField>; blur: boolean;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render({blur, fields}) {
        return <div class="mt-8">
            <button onClick={ () => this.props.setEditMode('none') }
                    title="Lopeta muokkaus"
                    class="btn btn-icon btn-sm with-icon my-2">
                <FeatherSvg iconId="check" className="feather-md"/> Lopeta muokkaus
            </button>
            <FieldsTable
                fields={ fields }
                onAddButtonClicked={ () => this.openCreateFieldDialog() }
                onEditButtonClicked={ f => this.openEditFieldDilaog(f) }
                onRemoveButtonClicked={ f => this.openDeleteFieldDialog(f) }
                blur={ blur }/>
        </div>;
    }
    /**
     * @access private
     */
    saveFieldToBackend(newData, originalData, mode) {
        const data = Object.assign({}, originalData, newData);
        const isNewContentType = mode === 'create';
        const url = `/api/content-types/field/${this.props.contentType.name}` +
                    (isNewContentType ? '' : `/${originalData.name}`);
        http[isNewContentType ? 'post' : 'put'](url, data)
            .then(() => {
                urlUtils.reload();
            })
            .catch(err => {
                services.console.error(err);
                toasters.main('Kentän ' + (isNewContentType
                    ? 'lisäys sisältötyyppiin'
                    : 'tallennus') + ' epäonnistui.', 'error');
            });
    }
    /**
     * @access private
     */
    openCreateFieldDialog() {
        popupDialog.open(CreateFieldDialog, {
            field: makeField(),
            onConfirm: (newData, field) => {
                this.saveFieldToBackend(newData, field, 'create');
            }
        });
    }
    /**
     * @access private
     */
    openEditFieldDilaog(field) {
        popupDialog.open(EditFieldDialog, {
            field,
            onConfirm: (newData, field) => {
                this.saveFieldToBackend(newData, field, 'edit');
            }
        });
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
                .then(() => { urlUtils.reload(); })
                .catch(err => {
                    services.console.error(err);
                    toasters.main('Kentän poisto sisältötyypistä epäonnistui.', 'error');
                });
            }
        });
    }
}

class FieldsTable extends preact.Component {
    /**
     * @access protected
     */
    render({fields, onEditButtonClicked, onRemoveButtonClicked, onAddButtonClicked, blur}) {
        return <><div class="panel bg-alt-light pt-1"><table class="table">
            <thead><tr>
                <th>#</th>
                <th>Nimi</th>
                <th>Datatyyppi</th>
                <th>Oletusarvo</th>
                <th>Näkyvyys</th>
                <th>Widgetti</th>
                <th class="buttons"></th>
            </tr></thead>
            <tbody>{ fields.map(f => <tr key={ f.key.toString() }>
                <td>{ f.name }</td>
                <td>{ f.friendlyName }</td>
                <td>{ f.dataType }</td>
                <td>{ f.defaultValue || '(tyhjä)' }</td>
                <td>{ f.visibility === 0 ? 'Ei rajattu' : 'Rajattu' }</td>
                <td>{ widgetTypes.find(t => t.name === f.widget.name).friendlyName }</td>
                <td class="buttons">
                    <button
                        class="btn btn-icon"
                        disabled={ blur }
                        onClick={ () => onEditButtonClicked(f) }
                        type="button">
                        <FeatherSvg iconId="edit-2" className="feather-sm"/>
                    </button>
                    <button
                        class="btn btn-icon"
                        onClick={ () => onRemoveButtonClicked(f) }
                        disabled={ fields.length < 2 }
                        type="button">
                        <FeatherSvg iconId="x" className="feather-sm"/>
                    </button>
                </td>
            </tr>) }</tbody>
        </table></div><button onClick={ () => onAddButtonClicked() }
                title="Lisää kenttä"
                class="btn btn-sm mt-8">
            Lisää kenttä
        </button></>;
    }
}

let counter = 0;

/**
 * @returns {ContentTypeField}
 * @access public
 */
function makeField() {
    return {
        name: `newField${++counter}`,
        friendlyName: 'Uusi kenttä',
        dataType: 'text',
        defaultValue: '',
        visibility: 0,
        widget: {
            name: 'textField',
            args: {}
        },
        key: counter
    };
}

/**
 * @param {Array<ContentTypeField>} fields
 */
const filterByUserRole = fields =>
    fields.filter(f =>
        f.visibility === 0 || f.visibility & config.user.role
    );

/**
 * @param {'none'|'edit'|'create'} mode
 * @returns {preact.ComponentClass|null}
 */
export default type => ({
    'none': StaticFieldList,
    'edit': OneByOneEditableFieldList,
    'create': FreelyEditableFieldList,
}[type] || null);

export {filterByUserRole, makeField};