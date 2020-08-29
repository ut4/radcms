import {http, config, toasters, urlUtils, View, FeatherSvg, InputGroup, FormButtons} from '@rad-commons';
import {contentFormRegister, FieldsFilter} from '@rad-cpanel-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {filterByUserRole} from '../ContentType/FieldLists.jsx';
import {Status} from './ContentAddView.jsx';
import webPageState from '../webPageState.js';

/**
 * #/edit-content/:id/:contentTypeName/:panelIdx?/:publish?[?return-to=path]
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
            formClasses: null,
            FormImpl: null,
            formImplProps: null
        };
        this.contentForm = preact.createRef();
        this.fetchContentAndUpdateState(props);
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.id !== this.props.id)
            this.fetchContentAndUpdateState(props);
        else if (props.panelIdx !== this.props.panelIdx)
            this.setState(this.makeFormCfgState(props));
    }
    /**
     * @access private
     */
    fetchContentAndUpdateState(props) {
        const newState = {doPublish: !!props.publish};
        this.title = 'Muokkaa sisältöä';
        this.submitButtonText = 'Tallenna';
        if (newState.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.submitButtonText = 'Julkaise';
        }
        http.get(`/api/content/${props.id}/${props.contentTypeName}`)
            .then(cnode => {
                this.contentNode = cnode;
                return http.get(`/api/content-types/${props.contentTypeName}`);
            })
            .then(ctype => {
                this.contentType = ctype;
            })
            .catch(() => {
                toasters.main('Jokin meni pieleen', 'error');
            })
            .finally(() => {
                this.setState(Object.assign(newState, this.makeFormCfgState(props)));
            });
    }
    /**
     * @access private
     */
    makeFormCfgState(props) {
        const panelConfig = webPageState.currentContentPanels[props.panelIdx || -1] || {};
        return {
            FormImpl: contentFormRegister.getImpl(panelConfig.editFormImpl || 'Default'),
            formImplProps: panelConfig.editFormImplProps || {},
        };
    }
    /**
     * @access protected
     */
    render(_, {FormImpl}) {
        if (!FormImpl) return null;
        return <View><form onSubmit={ e => this.handleFormSubmit(e) } class={ this.state.formClasses }>
            <h2 class="columns col-auto">{ [this.title].concat(this.contentNode ? [
                this.contentNode.isRevision && !this.props.publish
                    ? <sup class="color-alt"> (Luonnos)</sup>
                    : null,
                config.userPermissions.canDeleteContent
                    ? <button onClick={ () => openDeleteContentDialog(this.contentNode) }
                            class="btn btn-icon ml-1" title="Poista" type="button">
                        <FeatherSvg iconId="trash-2" className="medium"/>
                    </button>
                    : null
            ] : []) }</h2>
            { this.contentNode ? [
                <FormImpl
                    fields={ (new FieldsFilter(this.state.formImplProps.fieldsToDisplay))
                        .doFilter(filterByUserRole(this.contentType.fields)) }
                    values={ this.contentNode }
                    settings={ this.state.formImplProps }
                    getWidgetImpl={ getWidgetImpl }
                    key={ this.contentNode.id }
                    setFormClasses={ str => {
                        this.setState({formClasses: str.toString()});
                    } }
                    ref={ this.contentForm }
                    fieldHints={ [] }
                    contentType={ this.contentType }/>,
            this.contentNode.isRevision && !this.props.publish
                ? <InputGroup className="mt-2">
                    <label class="form-checkbox">
                        <input id="doPublish" type="checkbox" defaultChecked={ this.state.doPublish }
                            onChange={ e => this.setState({doPublish: e.target.checked}) }/>
                        <i class="form-icon"></i> Julkaise
                    </label>
                </InputGroup>
                : null,
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
                ] }/> ] : <p>Sisältöä ei löytynyt.</p> }
        </form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit(e, revisionSettings = null) {
        const values = this.contentForm.current.submit(e);
        if (!values)
            return;
        let status = this.contentNode.status;
        if (!revisionSettings)
            revisionSettings = !this.state.doPublish ? '' : '/publish';
        if (revisionSettings === '/publish')
            status = Status.PUBLISHED;
        else if (revisionSettings === '/unpublish')
            status = Status.DRAFT;
        return http.put(`/api/content/${this.props.id}/${this.props.contentTypeName}${revisionSettings}`,
            Object.assign(this.contentNode, values, {status}))
            .then(() => {
                if (e.altSubmitLinkIndex === 0) urlUtils.reload();
                else if (this.props.matches['return-to'] !== undefined) urlUtils.redirect(this.props.matches['return-to']);
                else urlUtils.redirect('@current', 'hard');
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
