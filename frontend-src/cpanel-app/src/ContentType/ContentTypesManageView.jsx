import {http, toasters, env, urlUtils, View, Confirmation, FeatherSvg} from '@rad-commons';
import getFieldListImplForEditMode, {makeField} from './FieldLists.jsx';
import ContentEditable from '../Common/ContentEditable.jsx';
import popupDialog from '../Common/PopupDialog.jsx';
let counter = 0;

/**
 * #/manage-content-types: Näkymä, jossa devaaja voi selata/lisätä/muokata si-
 * vuston sisältötyyppejä.
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
        this.basicInfoEditModes = [];
        this.fieldEditModes = [];
        this.fieldLists = [];
        http.get('/api/content-types')
            .then(contentTypes => {
                if (contentTypes.length) {
                    this.setState({contentTypes: contentTypes.map(t => {
                        this.basicInfoEditModes.push('none');
                        this.fieldEditModes.push('none');
                        this.fieldLists.push(preact.createRef());
                        return Object.assign(t, {
                            key: ++counter,
                            fields: t.fields.map(f => Object.assign(f, {key: makeField().key}))
                        });
                    })});
                } else this.setState({message: 'Sisältötyyppejä ei löytynyt'});
            })
            .catch(err => {
                env.console.error(err);
                this.setState({message: 'Jokin meni pieleen'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View>
            <h2>Sisältötyypit
                <button onClick={ () => this.prependNewContentType() }
                        class={ `btn btn-icon${!this.state.fieldsCurrentlyBeingEdited ? '' : ' disabled'}` }
                        title="Luo uusi sisältötyyppi">
                    <FeatherSvg iconId="plus-circle" className="medium"/>
                </button>
            </h2>
            { this.state.contentTypes
                ? <div class="item-grid two">{ this.state.contentTypes.map((t, i) => {
                    const useNormalWidth = this.basicInfoEditModes[i] === 'none' &&
                                           this.fieldEditModes[i] === 'none';
                    const ListCmp = getFieldListImplForEditMode(this.fieldEditModes[i]);
                    const blur = (this.state.contentTypeCurrentlyBeingEdited &&
                                  this.state.contentTypeCurrentlyBeingEdited !== t) ||
                                  this.state.fieldsCurrentlyBeingEdited !== null;
                    return <div class={ `panel bg-light${useNormalWidth ? '' : ' full-width'}${!blur ? '' : ' blurred'}` }
                                style={ useNormalWidth ? '' : `grid-row:${Math.floor(i / 2 + 1)}` }>
                        <BasicInfo
                            contentType={ t }
                            editMode={ this.basicInfoEditModes[i] }
                            blur={ blur }
                            onEditStarted={ () => this.setBasicInfoEditModeOn(t, i) }
                            onEditEnded={ (mode, data) => this.confirmBasicInfoEdit(mode, data, i) }
                            onEditDiscarded={ mode => this.discardBasicInfoEdit(mode) }
                            key={ t.key }/>
                        <ListCmp
                            fields={ t.fields }
                            blur={ (this.state.contentTypeCurrentlyBeingEdited &&
                                    this.fieldEditModes[i] !== 'create') ||
                                    (this.state.fieldsCurrentlyBeingEdited &&
                                    this.state.fieldsCurrentlyBeingEdited !== t) }
                            contentType={ t }
                            setEditMode={ to => {
                                this.fieldEditModes = this.fieldEditModes.map((_, i2) => i2 !== i ? 'none' : to);
                                this.setState({fieldsCurrentlyBeingEdited: to !== 'none' ? t : null});
                            } }
                            ref={ this.fieldLists[i] }
                            key={ t.key }/>
                    </div>;
                }) }</div>
                : !this.state.message
                    ? null
                    : <p>{ this.state.message}</p>
            }
        </View>;
    }
    /**
     * @access private
     */
    setBasicInfoEditModeOn(contentType, idx) {
        this.basicInfoEditModes[idx] = 'edit';
        this.setState({contentTypeCurrentlyBeingEdited: contentType});
    }
    /**
     * @access private
     */
    confirmBasicInfoEdit(mode, data, idx) {
        (mode === 'create'
            ? http.post('/api/content-types', Object.assign(data,
                {fields: this.fieldLists[idx].current.getFields()}
            ))
            : http.put(`/api/content-types/${this.state.contentTypes[idx].name}`, data)
        )
        .then(() => {
            urlUtils.reload();
        })
        .catch(err => {
            env.console.error(err);
            toasters.main('Sisältötyypin ' + (mode === 'create' ? 'luonti' : 'päivitys') +
                          ' epäonnistui.', 'error');
        });
    }
    /**
     * @access private
     */
    discardBasicInfoEdit(mode) {
        this.basicInfoEditModes = this.basicInfoEditModes.map(() => 'none');
        this.fieldEditModes = this.fieldEditModes.map(() => 'none');
        const newState = {contentTypeCurrentlyBeingEdited: null,
                          fieldsCurrentlyBeingEdited: null};
        if (mode === 'create') {
            newState.contentTypes = this.state.contentTypes.slice(1);
            this.basicInfoEditModes.shift();
            this.fieldLists.shift();
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
            fields: [makeField()],
            key: ++counter
        });
        this.basicInfoEditModes = ['create'].concat(this.basicInfoEditModes.map(() => 'none'));
        this.fieldEditModes = ['create'].concat(this.fieldEditModes.map(() => 'none'));
        this.fieldLists.unshift(preact.createRef());
        this.setState({contentTypes,
                       contentTypeCurrentlyBeingEdited: contentTypes[0],
                       fieldsCurrentlyBeingEdited: contentTypes[0]});
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
            <header class="columns col-centered mb-2">
                <h3 class="column m-0">{ this.state.name }</h3>
                <div>
                    <button onClick={ () => this.props.onEditStarted() }
                            disabled={ this.props.blur }
                            title="Muokkaa sisältötyyppiä"
                            class="btn btn-icon">
                        <FeatherSvg iconId="edit" className="feather-md"/>
                    </button>
                    <button onClick={ () => this.openDeleteDialog() }
                            disabled={ this.props.blur }
                            title="Poista sisältötyyppi"
                            class="btn btn-icon">
                        <FeatherSvg iconId="x" className="feather-md"/>
                    </button>
                </div>
            </header>
            <div class="mb-8">
                <div>Selkonimi: { this.state.friendlyName }</div>
                <div data-help-text="Sisäiset sisältötyypit ei näy &quot;Luo sisältöä&quot;-, ja &quot;Kaikki sisältö&quot; -näkymissä.">Piilotettu: { !this.state.isInternal ? 'ei' : 'kyllä' }</div>
            </div>
        </div>;
        // edit or create
        return <div>
            <header class="columns col-centered pr-2 mb-2">
                <h3 class="column m-0">
                    <ContentEditable
                        value={ this.state.name }
                        onChange={ val => this.setState({name: val}) }/>
                </h3>
                <div>
                    <button onClick={ () => this.endEdit() }
                            title={ `${this.props.editMode === 'edit' ? 'Tallenna' : 'Luo'} sisältötyyppi` }
                            class="btn btn-icon">
                        <FeatherSvg iconId="save"/>
                    </button>
                    <button onClick={ () => this.endEdit(true) }
                            title="Peruuta"
                            class="btn btn-link">
                        Peruuta
                    </button>
                </div>
            </header>
            <div class="container mb-8">
                <div class="columns">Selkonimi:
                    <div class="ml-2"><ContentEditable
                        value={ this.state.friendlyName }
                        onChange={ val => this.setState({friendlyName: val}) }/></div>
                </div>
                <label class="columns col-centered">Piilotettu:
                    <div class="form-checkbox ml-2">
                        <input
                            type="checkbox"
                            defaultChecked={ this.state.isInternal }
                            onChange={ e => this.setState({isInternal: e.target.checked}) }/>
                        <i class="form-icon"></i>
                    </div>
                </label>
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
                    .then(() => { urlUtils.reload(); })
                    .catch(err => {
                        env.console.error(err);
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
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Poista sisältötyyppi"
                onCancel={ () => this.handleCancel() }>
            <h2>Poista sisältötyyppi</h2>
            <div class="main">
                <p>Poista sisältötyyppi &quot;{ this.props.contentType.friendlyName }&quot; ({ this.props.contentType.name }) ja siihen liittyvä data pysyvästi?</p>
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

export default ContentTypesManageView;
