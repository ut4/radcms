import {http, toasters, View, FeatherSvg} from '@rad-commons';
import FieldList from './FieldList.jsx';
import FieldsStore from './FieldsStore.js';
import ContentEditable from './ContentEditable.jsx';

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
                      emptyContentTypeIsPrepended: false,
                      message: ''};
        http.get('/api/content-types')
            .then(contentTypes => {
                if (contentTypes.length) this.setState({contentTypes});
                else this.setState({message: 'Sisältötyyppejä ei löytynyt'});
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
                                 class="icon-only"
                                 title="Luo uusi sisältötyyppi">
                                  <FeatherSvg iconId="plus-circle" className="small"/>
                              </a></h2>
            { this.state.contentTypes
                ? <div class="item-grid">{ this.state.contentTypes.map((t, i) =>
                    <ContentTypesManageView.ContentTypeCard
                        contentType={ t }
                        isNew={ this.state.emptyContentTypeIsPrepended && i === 0 }
                        disallowEditing={ this.state.emptyContentTypeIsPrepended && i !== 0 }
                        onNewContentTypeCommitted={ t => this.saveNewContentType(t) }
                        onNewContentTypeDiscarded={ () => this.discardNewPrependedContentType() }
                        key={ t.name }/>
                ) }</div>
                : !this.state.message
                    ? null
                    : <p>{ this.state.message}</p>
            }
        </div></View>;
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
            fields: [FieldsStore.makeField()]
        });
        this.setState({contentTypes, emptyContentTypeIsPrepended: true});
    }
    /**
     * @access private
     */
    saveNewContentType(contentType) {
        return http.post('/api/content-types', contentType);
    }
    /**
     * @access private
     */
    discardNewPrependedContentType() {
        this.setState({contentTypes: this.state.contentTypes.slice(1),
                       emptyContentTypeIsPrepended: false});
    }
}

ContentTypesManageView.ContentTypeCard = class extends preact.Component {
    /**
     * @param {{contentType: ContentType; isNew: boolean; disallowEditing: boolean; onNewContentTypeCommitted: (newContntType: ContentType) => Promise; onNewContentTypeDiscarded: () => any;}} props
     */
    constructor(props) {
        super(props);
        this.fieldsState = new FieldsStore(props.contentType.fields);
        this.state = {isBeingEdited: props.isNew,
                      name: props.contentType.name,
                      friendlyName: props.contentType.friendlyName,
                      isInternal: props.contentType.isInternal};
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.isBeingEdited) return <div class={ `box${!this.props.disallowEditing ? '' : ' disallow-edit'}` }>
            <header>
                <h3>{ this.state.name }</h3>
                <div>
                    <button onClick={ () => this.beginEdit() }
                            disabled={ this.props.disallowEditing }
                            title="Muokkaa sisältötyyppiä"
                            class="icon-button">
                        <FeatherSvg iconId="edit"/>
                    </button>
                    <button onClick={ () => this.showDeleteDialog() }
                            disabled={ this.props.disallowEditing }
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
            <FieldList fieldsState={ this.fieldsState }
                       formMode="editForm"
                       disallowEditing={ this.props.disallowEditing }/>
        </div>;
        //
        return <div class={ `box${!this.props.isNew ? '' : ' full-width'}` }>
            <header>
                <h3>
                    <ContentEditable
                        value={ this.state.name }
                        onChange={ val => this.setState({name: val}) }/>
                </h3>
                <div>
                    <button onClick={ () => this.endEdit(true) }
                            title="Luo sisältötyyppi"
                            class="icon-button">
                        <FeatherSvg iconId="save"/>
                    </button>
                    <button onClick={ () => this.endEdit(false) }
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
            <FieldList fieldsState={ this.fieldsState }
                       formMode="createForm"/>
        </div>;
    }
    /**
     * @access private
     */
    beginEdit() {
        this.setState({isBeingEdited: true});
    }
    /**
     * @access private
     */
    endEdit(doCommitChanges) {
        if (doCommitChanges) {
            this.props.onNewContentTypeCommitted(Object.assign({}, this.props.contentType, {
                name: this.state.name,
                friendlyName: this.state.friendlyName,
                isInternal: this.state.isInternal,
                fields: this.fieldsState.getFields(),
            }))
            .then(() => {
                this.setState({isBeingEdited: false});
            })
            .catch(() => {
                toasters.main('Sisältötyypin luonti epäonnistui', 'error');
            });
        } else {
            this.setState({isBeingEdited: false});
            this.props.onNewContentTypeDiscarded();
        }
    }
};

export default ContentTypesManageView;
