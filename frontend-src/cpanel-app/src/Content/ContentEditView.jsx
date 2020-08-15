import {http, config, toasters, urlUtils, View, FeatherSvg, InputGroup, FormButtons} from '@rad-commons';
import {contentFormRegister, ContentFormImpl} from '@rad-cpanel-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {filterByUserRole} from '../ContentType/FieldLists.jsx';
import {Status} from './ContentAddView.jsx';
import webPageState from '../webPageState.js';

/**
 * #/edit-content/:id/:contentTypeName/:panelIdx?/:publish?
 */
class ContentEditView extends preact.Component {
    /**
     * @param {{id: string; contentTypeName: string; panelIdx?: string; publish?: string;}} props
     */
    constructor(props) {
        super(props);
        this.contentNode = null;
        this.contentType = null;
        this.state = {
            doPublish: false,
            contentNodeFetched: false,
            contentTypeFetched: false,
            formClasses: null,
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
        const panelConfig = (this.props.panelIdx || 'none') !== 'none' ?
            webPageState.currentContentPanels[this.props.panelIdx] : null;
        const FormImpl = contentFormRegister.getImpl(panelConfig ? panelConfig.editFormImpl : ContentFormImpl.Default);
        return <View><form onSubmit={ e => this.handleFormSubmit(e) } class={ this.state.formClasses }>
            <h2 class="columns col-auto">{ [
                this.title,
                this.contentNode.isRevision && !this.props.publish
                    ? <sup class="color-alt"> (Luonnos)</sup>
                    : null,
                config.userPermissions.canDeleteContent
                    ? <button onClick={ () => openDeleteContentDialog(this.contentNode) }
                            class="btn btn-icon ml-1" title="Poista" type="button">
                        <FeatherSvg iconId="trash-2" className="medium"/>
                    </button>
                    : null
            ] }</h2>
            <FormImpl
                key={ this.contentNode.id }
                fields={ filterByUserRole(this.contentType.fields) }
                settings={ panelConfig ? panelConfig.editFormImplProps : {} }
                setContentNodeValue={ (value, fieldName) => {
                    this.contentNode[fieldName] = value;
                } }
                getWidgetImpl={ getWidgetImpl }
                editForm={ this }/>
            { this.contentNode.isRevision && !this.props.publish
                ? <InputGroup className="mt-2">
                    <label class="form-checkbox">
                        <input id="doPublish" type="checkbox" defaultChecked={ this.state.doPublish }
                            onChange={ e => this.setState({doPublish: e.target.checked}) }/>
                        <i class="form-icon"></i> Julkaise
                    </label>
                </InputGroup>
                : null }
            <FormButtons
                submitButtonText={ this.submitButtonText }
                altSubmitButtonText="Tallenna ja palaa"
                buttons={ [
                    'submitWithAlt',
                    !this.contentNode.isRevision
                        ? <button onClick={ e => this.switchToDraft(e) } class="btn ml-2" type="button">
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
            if (e.altSubmitLinkIndex !== 0) urlUtils.redirect('@current', 'hard');
            else urlUtils.reload();
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
