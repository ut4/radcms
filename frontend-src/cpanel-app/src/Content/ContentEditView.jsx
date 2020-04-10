import {http, config, toasters, urlUtils, View, FeatherSvg, Form, InputGroup, Input} from '@rad-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {filterByUserRole} from '../ContentType/FieldList.jsx';
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
        this.contentNode = null;
        this.contentType = null;
        this.state = {
            doPublish: false,
            contentNodeFetched: false,
            contentTypeFetched: false,
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
        return <View><Form onSubmit={ () => this.handleFormSubmit() }
                           submitButtonText={ this.submitButtonText }
                           buttons={ [
                               'submit',
                                !this.contentNode.isRevision
                                    ? <button onClick={ () => this.switchToDraft() } class="nice-button" type="button">
                                        Vaihda luonnokseen
                                    </button>
                                    : null,
                                'cancel'
                            ] }>
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
            { filterByUserRole(this.contentType.fields).map(f => {
                const {ImplClass, props} = getWidgetImpl(f.widget.name);
                return <ImplClass
                    field={ f }
                    initialValue={ this.contentNode[f.name] }
                    settings={ props }
                    onValueChange={ value => {
                        this.contentNode[f.name] = value;
                    }}/>;
            }) }
            { this.contentNode.isRevision && !this.props.publish
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
    switchToDraft() {
        this.handleFormSubmit('/unpublish');
    }
}

export default ContentEditView;
