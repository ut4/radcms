import {services, components} from '../../../rad-commons.js';
import ContentNodeFieldList from './ContentNodeFieldList.js';
const {View, Form} = components;

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
        services.http.get(`/api/content/${props.id}/${props.contentTypeName}`)
            .then(cnode => {
                newState.contentNode = cnode;
                return services.http.get('/api/content-types/' + props.contentTypeName);
            })
            .then(ctype => {
                newState.contentType = ctype;
            })
            .catch(() => {
                toast('Jokin meni pieleen', 'error');
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
        return $el(View, null, $el(Form, {onConfirm: () => this.handleFormSubmit(),
                                          confirmButtonText: this.confirmButtonText,
                                          autoClose: false},
            $el('h2', null, this.title, showPublishToggle
                ? $el('sup', null, ' (Luonnos)')
                : null),
            $el(ContentNodeFieldList, {contentNode: this.state.contentNode,
                                       contentType: this.state.contentType,
                                       ref: cmp => { if (cmp) this.fieldListCmp = cmp; },
                                       key: this.state.contentNode.id}),
            showPublishToggle
                ? $el('div', null,
                    $el('input', {id: 'i-create-rev', type: 'checkbox',
                                  onChange: e => this.setState({doPublish: e.target.checked})}),
                    $el('label', {for: 'i-create-rev', className: 'inline'}, 'Julkaise')
                )
                : null
        ));
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        const revisionSettings = !this.state.doPublish ? '' : '/publish';
        return services.http.put(`/api/content/${this.props.id}/${this.props.contentTypeName}${revisionSettings}`,
            Object.assign({isPublished: this.state.contentNode.isPublished,
                           isRevision: this.state.contentNode.isRevision},
                          this.fieldListCmp.getResult())
        )
        .then(() => {
            services.redirect(this.props.returnTo || '/', true);
        })
        .catch(() => {
            toast('Sisällön tallennus epäonnistui.', 'error');
        });
    }
}

export default ContentEditView;
