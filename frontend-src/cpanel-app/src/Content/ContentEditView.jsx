import {http, config, toasters, urlUtils, View, FeatherSvg, Form, InputGroup, Input} from '@rad-commons';
import ContentNodeFieldList from './ContentNodeFieldList.jsx';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import {Status} from './ContentAddView.jsx';

/**
 * #/edit-content/:id/:contentTypeName/:publish?
 */
class ContentEditView extends preact.Component {
    /**
     * @param {{id: string; contentTypeName: string; publish?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {
            contentNode: null,
            contentType: null,
            doPublish: false,
        };
        this.updateState(this.props);
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.id !== this.props.id)
            this.updateState(props);
    }
    /**
     * @access private
     */
    updateState(props) {
        const newState = {contentNode: null, contentType: null, doPublish: !!props.publish};
        this.title = 'Muokkaa sisältöä';
        this.submitButtonText = 'Tallenna';
        if (newState.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.submitButtonText = 'Julkaise';
        }
        http.get(`/api/content/${props.id}/${props.contentTypeName}`)
            .then(cnode => {
                newState.contentNode = cnode;
                return http.get('/api/content-types/' + props.contentTypeName);
            })
            .then(ctype => {
                newState.contentType = ctype;
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
        if (!this.state.contentType) return null;
        return <View><Form onSubmit={ () => this.handleFormSubmit() }
                           submitButtonText={ this.submitButtonText }
                           buttons={ [
                               'submit',
                                !this.state.contentNode.isRevision
                                    ? <button onClick={ () => this.switchToDraft() } class="nice-button" type="button">
                                        Vaihda luonnokseen
                                    </button>
                                    : null,
                                'cancel'
                            ] }>
            <h2>{ [
                this.title,
                this.state.contentNode.isRevision && !this.state.doPublish
                    ? <sup> (Luonnos)</sup>
                    : null,
                config.userPermissions.canDeleteContent
                    ? <button onClick={ () => openDeleteContentDialog(this.state.contentNode) }
                            class="icon-button" title="Poista" type="button">
                        <FeatherSvg iconId="trash-2" className="medium"/>
                    </button>
                    : null
            ] }</h2>
            <ContentNodeFieldList contentNode={ this.state.contentNode }
                                  contentType={ this.state.contentType }
                                  ref={ cmp => { if (cmp) this.fieldListCmp = cmp; } }
                                  key={ this.state.contentNode.id }/>
            { this.state.contentNode.isRevision
                ? <InputGroup label="Julkaise" inline={ true }>
                    <Input id="i-publish" type="checkbox" defaultChecked={ this.state.doPublish }
                           onChange={ e => this.setState({doPublish: e.target.checked}) }/>
                </InputGroup>
                : null }
        </Form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit(revisionSettings = null) {
        let status = this.state.contentNode.status;
        if (!revisionSettings)
            revisionSettings = !this.state.doPublish ? '' : '/publish';
        if (revisionSettings === '/publish')
            status = Status.PUBLISHED;
        else if (revisionSettings === '/unpublish')
            status = Status.DRAFT;
        return http.put(`/api/content/${this.props.id}/${this.props.contentTypeName}${revisionSettings}`,
            Object.assign(this.fieldListCmp.getResult(),
                          {status, isRevision: this.state.contentNode.isRevision})
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
    switchToDraft() {
        this.handleFormSubmit('/unpublish');
    }
}

export default ContentEditView;
