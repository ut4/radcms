import {http, toasters, config, urlUtils, FeatherSvg, Sortable, env} from '@rad-commons';
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
                    <div class="col-5 text-ellipsis">{ widgetTypes.find(t =>
                        t.name === f.widget.name).friendlyName }</div>
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
            onFieldsReordered={ sorted => this.setState({fields: sorted}) }
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
     * @param {{fields: Array<ContentTypeField>; contentType: ContentType; blur: boolean;}} props
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
        return <div class="mt-8">
            <button onClick={ () => this.props.setEditMode('none') }
                    title="Lopeta muokkaus"
                    class="btn btn-icon btn-sm with-icon my-2">
                <FeatherSvg iconId="check" className="feather-md"/> Lopeta muokkaus
            </button>
            <FieldsTable
                fields={ fields }
                onAddButtonClicked={ this.openCreateFieldDialog.bind(this) }
                onEditButtonClicked={ this.openEditFieldDialog.bind(this) }
                onRemoveButtonClicked={ this.openDeleteFieldDialog.bind(this) }
                onFieldsReordered={ this.saveNewFieldsOrderToBackend.bind(this) }
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
                env.console.error(err);
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
    openEditFieldDialog(field) {
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
                    env.console.error(err);
                    toasters.main('Kentän poisto sisältötyypistä epäonnistui.', 'error');
                });
            }
        });
    }
    /**
     * @access private
     */
    saveNewFieldsOrderToBackend(sorted, fieldsTable) {
        const old = this.state.fields.slice(0);
        this.setState({fields: sorted});
        fieldsTable.setState({loading: true});
        http.put(`/api/content-types/${this.props.contentType.name}/reorder-fields`,
                 {fields: sorted})
            .then(() => {
                toasters.main('Kenttien järjestys tallennettiin', 'success');
                fieldsTable.setState({loading: false});
            })
            .catch(err => {
                env.console.error(err);
                this.setState({fields: old});
            });
    }
}

class FieldsTable extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.sortable = new Sortable();
        this.state = {loading: false};
    }
    /**
     * @access protected
     */
    render({fields, onEditButtonClicked, onRemoveButtonClicked, onAddButtonClicked, blur}) {
        return <><div class="panel bg-alt-light pt-1"><table class="table">
            <thead><tr>
                <th class="drag-column"></th>
                <th>#</th>
                <th>Nimi</th>
                <th>Datatyyppi</th>
                <th>Oletusarvo</th>
                <th>Näkyvyys</th>
                <th>Widgetti</th>
                <th class="buttons"></th>
            </tr></thead>
            <tbody
                class={ !this.state.loading ? '' : ' no-drag' }
                ref={ this.activateSorting.bind(this) }>{ fields.map(f => <tr key={ f.key } data-id={ f.key }>
                <td class="drag-column">
                    <button class="drag-handle" type="button"><FeatherSvg iconId="grid-dots"/></button>
                </td>
                <td>{ f.name }</td>
                <td>{ f.friendlyName }</td>
                <td>{ f.dataType.type + (!f.dataType.length ? '' : `(${f.dataType.length})`) }</td>
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
    /**
     * @access private
     */
    activateSorting(tbodyEl) {
        this.sortable.register(tbodyEl, {
            handle: '.drag-handle',
            onReorder: orderedIds => {
                this.props.onFieldsReordered(orderedIds.map(key =>
                    this.props.fields.find(f => f.key === key)
                ), this);
            },
        });
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
        dataType: {type: 'text', length: null},
        defaultValue: '',
        visibility: 0,
        widget: {
            name: 'textField',
            args: {}
        },
        key: counter.toString()
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
