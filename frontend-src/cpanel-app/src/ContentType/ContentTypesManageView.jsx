import {http, toasters, urlUtils, View, Form, FeatherSvg} from '@rad-commons';
import FieldList from './FieldList.jsx';
import FieldsStore from './FieldsStore.js';
import ContentEditable from '../Common/ContentEditable.jsx';
import popupDialog from '../Common/PopupDialog.jsx';
let counter = 0;

/**
 * #/manage-content-types
 */
class ContentTypesManageView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {contentTypes: null,
                      contentTypeCurrentlyBeingEdited: null, // or created
                      fieldsCurrentlyBeingEdited: null,
                      message: ''};
        this.fieldStates = [];
        http.get('/api/content-types')
            .then(contentTypes => {
                if (contentTypes.length) {
                    this.setState({contentTypes: contentTypes.map(t => {
                                        this.fieldStates.push(new FieldsStore(t.fields));
                                        t.key = ++counter;
                                        return t;
                                    }),
                                   basicInfoEditModes: contentTypes.map(() => 'none')});
                    this.fieldStates.forEach((state, i) => {
                        state.listen('editMode', isOn => {
                            this.setState({fieldsCurrentlyBeingEdited:
                                isOn !== 'none' ? this.state.contentTypes[i] : null});
                        });
                    });
                } else this.setState({message: 'Sisältötyyppejä ei löytynyt'});
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View><div>
            <h2>Sisältötyypit <a onClick={ () => this.prependNewContentType() }
                                 class={ `icon-only${!this.state.fieldsCurrentlyBeingEdited ? '' : ' disabled'}` }
                                 title="Luo uusi sisältötyyppi">
                                  <FeatherSvg iconId="plus-circle" className="medium"/>
                              </a></h2>
            { this.state.contentTypes
                ? <div class="item-grid">{ this.state.contentTypes.map((t, i) => {
                    const useNormalWidth = this.state.basicInfoEditModes[i] === 'none' &&
                                           this.fieldStates[i].getEditMode() === 'none';
                    return <div class={ `box content-type-card${useNormalWidth ? '' : ' full-width'}` }
                                style={ useNormalWidth ? '' : `grid-row:${Math.floor(i / 2 + 1)}` }>
                        <BasicInfo
                            contentType={ t }
                            editMode={ this.state.basicInfoEditModes[i] }
                            blur={ (this.state.contentTypeCurrentlyBeingEdited &&
                                    this.state.contentTypeCurrentlyBeingEdited !== t) ||
                                    this.state.fieldsCurrentlyBeingEdited !== null }
                            onEditStarted={ () => this.setBasicInfoEditModeOn(t, i) }
                            onEditEnded={ (mode, data) => this.endBasicInfoEdit(mode, data, i) }
                            onEditDiscarded={ mode => this.discardBasicInfoEdit(mode) }
                            key={ t.key }/>
                        <FieldList
                            fieldsState={ this.fieldStates[i] }
                            editMode={ this.fieldStates[i].getEditMode() }
                            blur={ (this.state.contentTypeCurrentlyBeingEdited &&
                                    this.state.basicInfoEditModes[i] !== 'create') ||
                                    (this.state.fieldsCurrentlyBeingEdited &&
                                    this.state.fieldsCurrentlyBeingEdited !== t) }
                            contentType={ t }
                            key={ t.key }/>
                    </div>;
                }) }</div>
                : !this.state.message
                    ? null
                    : <p>{ this.state.message}</p>
            }
        </div></View>;
    }
    /**
     * @access private
     */
    setBasicInfoEditModeOn(contentType, idx) {
        const modes = this.state.basicInfoEditModes;
        this.setState({basicInfoEditModes: modes.map((m, i) => i !== idx ? m : 'edit'),
                       contentTypeCurrentlyBeingEdited: contentType});
    }
    /**
     * @access private
     */
    endBasicInfoEdit(mode, data, idx) {
        if (mode === 'create')
            http.post('/api/content-types', Object.assign(data,
                {fields: this.fieldStates[idx].getFields()}
            ))
            .then(() => {
                urlUtils.reload();
            })
            .catch(() => {
                toasters.main('Sisältötyypin luonti epäonnistui.', 'error');
            });
        else
            http.put(`/api/content-types/${this.state.contentTypes[idx].name}`, data)
            .then(() => {
                urlUtils.reload();
            })
            .catch(() => {
                toasters.main('Sisältötyypin päivitys epäonnistui.', 'error');
            });
    }
    /**
     * @access private
     */
    discardBasicInfoEdit(mode) {
        const newState = {basicInfoEditModes: this.state.basicInfoEditModes.map(() => 'none'),
                          contentTypeCurrentlyBeingEdited: null,
                          fieldsCurrentlyBeingEdited: null};
        if (mode === 'create') {
            newState.contentTypes = this.state.contentTypes.slice(1);
            newState.basicInfoEditModes.shift();
            this.fieldStates.shift();
        }
        this.setState(newState);
    }
    /**
     * @access private
     */
    prependNewContentType() {
        const contentTypes = this.state.contentTypes;
        contentTypes.unshift({
            name: 'Name',
            friendlyName: 'Nimi',
            isInternal: false,
            fields: [FieldsStore.makeField()],
            key: ++counter
        });
        this.fieldStates.unshift(new FieldsStore(contentTypes[0].fields, 'create'));
        this.setState({contentTypes,
                       basicInfoEditModes: ['create'].concat(this.state.basicInfoEditModes.map(() => 'none')),
                       contentTypeCurrentlyBeingEdited: contentTypes[0]});
    }
}

class BasicInfo extends preact.Component {
    /**
     * @param {{contentType: Object; editMode: string; blur: boolean; onEditStarted: () => any; onEditEnded: (mode: string, data: Object) => any; onEditDiscarded: (mode: string) => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = {name: props.contentType.name,
                      friendlyName: props.contentType.friendlyName,
                      isInternal: props.contentType.isInternal};
    }
    /**
     * @access protected
     */
    render() {
        if (this.props.editMode === 'none') return <div class={ !this.props.blur ? '' : 'blurred' }>
            <header>
                <h3>{ this.state.name }</h3>
                <div>
                    <button onClick={ () => this.props.onEditStarted() }
                            disabled={ this.props.blur }
                            title="Muokkaa sisältötyyppiä"
                            class="icon-button">
                        <FeatherSvg iconId="edit"/>
                    </button>
                    <button onClick={ () => this.openDeleteDialog() }
                            disabled={ this.props.blur }
                            title="Poista sisältötyyppi"
                            class="icon-button">
                        <FeatherSvg iconId="x"/>
                    </button>
                </div>
            </header>
            <div class="list left-aligned">
                <div class="row">Selkonimi: { this.state.friendlyName }</div>
                <div class="row">Sisäinen: { !this.state.isInternal ? 'ei' : 'kyllä' }</div>
            </div>
        </div>;
        // edit or create
        return <div>
            <header>
                <h3>
                    <ContentEditable
                        value={ this.state.name }
                        onChange={ val => this.setState({name: val}) }/>
                </h3>
                <div>
                    <button onClick={ () => this.endEdit() }
                            title={ `${this.props.editMode === 'edit' ? 'Tallenna' : 'Luo'} sisältötyyppi` }
                            class="icon-button">
                        <FeatherSvg iconId="save"/>
                    </button>
                    <button onClick={ () => this.endEdit(true) }
                            title="Peruuta"
                            class="text-button">
                        Peruuta
                    </button>
                </div>
            </header>
            <div class="list left-aligned">
                <div class="row">Selkonimi:
                    <div><ContentEditable
                        value={ this.state.friendlyName }
                        onChange={ val => this.setState({friendlyName: val}) }/></div>
                </div>
                <div class="row">Sisäinen:
                    <div><input
                        type="checkbox"
                        defaultChecked={ this.state.isInternal }
                        onChange={ e => this.setState({isInternal: e.target.checked}) }/></div>
                </div>
            </div>
        </div>;
    }
    /**
     * @param {boolean} wasCancelled
     * @access private
     */
    endEdit(wasCancelled) {
        if (wasCancelled) {
            this.props.onEditDiscarded(this.props.editMode);
            return;
        }
        this.props.onEditEnded(this.props.editMode, {
            name: this.state.name,
            friendlyName: this.state.friendlyName,
            isInternal: this.state.isInternal
        });
    }
    /**
     * @access private
     */
    openDeleteDialog() {
        popupDialog.open(DeleteDialog, {
            contentType: this.props.contentType,
            onConfirm: () => {
                http.delete('/api/content-types/' + this.props.contentType.name)
                    .then(() => {
                        urlUtils.reload();
                    })
                    .catch(() => {
                        toasters.main('Sisältötyypin poisto epäonnistui.', 'error');
                    });
            }
        });
    }
}

class DeleteDialog extends preact.Component {
    /**
     * @param {{contentType: ContentType;}} props
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
                confirmButtonText="Poista sisältötyyppi"
                onCancel={ () => this.handleCancel() }
                autoClose={ false }>
            <h2>Poista sisältötyyppi</h2>
            <div class="main">
                <p>Poista sisältötyyppi &quot;{ this.props.contentType.friendlyName }&quot; ({ this.props.contentType.name }) ja siihen liittyvä data pysyvästi?</p>
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

export default ContentTypesManageView;
