import {http, toasters, urlUtils, View, Form, InputGroup} from '@rad-commons';
import ContentNodeFieldList from './ContentNodeFieldList.jsx';

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
        this.confirmButtonText = 'Tallenna';
        if (newState.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.confirmButtonText = 'Julkaise';
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
        const showPublishToggle = !this.props.publish && this.state.contentNode.isRevision;
        return <View><Form onConfirm={ () => this.handleFormSubmit() }
                           confirmButtonText={ this.confirmButtonText }>
            <h2>{ [this.title, showPublishToggle ? <sup> (Luonnos)</sup> : null] }</h2>
            <ContentNodeFieldList contentNode={ this.state.contentNode }
                                  contentType={ this.state.contentType }
                                  ref={ cmp => { if (cmp) this.fieldListCmp = cmp; } }
                                  key={ this.state.contentNode.id }/>
            { showPublishToggle
                ? <InputGroup label="Julkaise" inline={ true }>
                    <input id="i-publish" type="checkbox" defaultChecked={ true }
                           onChange={ e => this.setState({doPublish: e.target.checked}) }/>
                </InputGroup>
                : null }
        </Form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        const revisionSettings = !this.state.doPublish ? '' : '/publish';
        return http.put(`/api/content/${this.props.id}/${this.props.contentTypeName}${revisionSettings}`,
            Object.assign({isPublished: this.state.contentNode.isPublished,
                           isRevision: this.state.contentNode.isRevision},
                          this.fieldListCmp.getResult())
        )
        .then(() => {
            urlUtils.redirect(this.props.returnTo || '/', 'hard');
        })
        .catch(() => {
            toasters.main('Sisällön tallennus epäonnistui.', 'error');
        });
    }
}

export default ContentEditView;
