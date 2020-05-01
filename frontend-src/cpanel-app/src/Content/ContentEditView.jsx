import {http, config, toasters, urlUtils, View, FeatherSvg, InputGroup2, FormButtons} from '@rad-commons';
import {contentFormRegister} from '@rad-cpanel-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {filterByUserRole} from '../ContentType/FieldList.jsx';
import {Status} from './ContentAddView.jsx';

/**
 * #/edit-content/:id/:contentTypeName/:formImpl/:publish?
 */
class ContentEditView extends preact.Component {
    /**
     * @param {{id: string; contentTypeName: string; publish?: string;}} props
     */
    constructor(props) {
        super(props);
        this.contentNode = null;
        this.contentType = null;
        this.state = {
            doPublish: false,
            contentNodeFetched: false,
            contentTypeFetched: false,
        };
        this.fetchContentAndUpdateState(this.props);
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.id !== this.props.id)
            this.fetchContentAndUpdateState(props);
    }
    /**
     * @access private
     */
    fetchContentAndUpdateState(props) {
        const newState = {contentNodeFetched: false,
                          contentTypeFetched: false,
                          doPublish: !!props.publish};
        this.title = 'Muokkaa sisältöä';
        this.submitButtonText = 'Tallenna';
        if (newState.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.submitButtonText = 'Julkaise';
        }
        http.get(`/api/content/${props.id}/${props.contentTypeName}`)
            .then(cnode => {
                this.contentNode = cnode;
                newState.contentNodeFetched = true;
                return http.get('/api/content-types/' + props.contentTypeName);
            })
            .then(ctype => {
                this.contentType = ctype;
                newState.contentTypeFetched = true;
            })
            .catch(() => {
                toasters.main('Jokin meni pieleen', 'error');
            })
            .finally(() => {
                this.setState(newState);
            });
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentNodeFetched || !this.state.contentTypeFetched) return null;
        const FormImpl = contentFormRegister.getImpl(this.props.formImpl);
        return <View><form onSubmit={ e => this.handleFormSubmit(e) }>
            <h2>{ [
                this.title,
                this.contentNode.isRevision && !this.props.publish
                    ? <sup> (Luonnos)</sup>
                    : null,
                config.userPermissions.canDeleteContent
                    ? <button onClick={ () => openDeleteContentDialog(this.contentNode) }
                            class="icon-button" title="Poista" type="button">
                        <FeatherSvg iconId="trash-2" className="medium"/>
                    </button>
                    : null
            ] }</h2>
            <FormImpl
                fields={ filterByUserRole(this.contentType.fields) }
                contentNode={ this.contentNode }
                setContentNodeValue={ (value, fieldName) => {
                    this.contentNode[fieldName] = value;
                } }
                getWidgetImpl={ getWidgetImpl }/>
            { this.contentNode.isRevision && !this.props.publish
                ? <InputGroup2 inline>
                    <label htmlFor="doPublish">Julkaise</label>
                    <input id="doPublish" type="checkbox" defaultChecked={ this.state.doPublish }
                           onChange={ e => this.setState({doPublish: e.target.checked}) }/>
                </InputGroup2>
                : null }
            <FormButtons
                submitButtonText={ this.submitButtonText }
                buttons={ [
                    'submit',
                    !this.contentNode.isRevision
                        ? <button onClick={ e => this.switchToDraft(e) } class="nice-button" type="button">
                            Vaihda luonnokseen
                        </button>
                        : null,
                    'cancel'
                ] }/>
        </form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit(e, revisionSettings = null) {
        e.preventDefault();
        let status = this.contentNode.status;
        if (!revisionSettings)
            revisionSettings = !this.state.doPublish ? '' : '/publish';
        if (revisionSettings === '/publish')
            status = Status.PUBLISHED;
        else if (revisionSettings === '/unpublish')
            status = Status.DRAFT;
        return http.put(`/api/content/${this.props.id}/${this.props.contentTypeName}${revisionSettings}`,
            Object.assign(this.contentNode, {status})
        )
        .then(() => {
            urlUtils.redirect('@current', 'hard');
        })
        .catch(() => {
            toasters.main('Sisällön tallennus epäonnistui.', 'error');
        });
    }
    /**
     * @access private
     */
    switchToDraft(e) {
        this.handleFormSubmit(e, '/unpublish');
    }
}

export default ContentEditView;
