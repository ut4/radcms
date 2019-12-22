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
            cnode: null,
            ctype: null,
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
        const newState = {cnode: null, ctype: null, doPublish: !!props.publish};
        this.title = 'Muokkaa sisältöä';
        this.confirmButtonText = 'Tallenna';
        if (newState.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.confirmButtonText = 'Julkaise';
        }
        services.http.get(`/api/content/${props.id}/${props.contentTypeName}`)
            .then(cnode => {
                newState.cnode = cnode;
                return services.http.get('/api/content-types/' + props.contentTypeName);
            })
            .then(ctype => {
                newState.ctype = ctype;
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
        if (!this.state.ctype) return null;
        const showPublishToggle = !this.props.publish && this.state.cnode.isRevision;
        return $el(View, null, $el(Form, {onConfirm: e => this.handleFormSubmit(e),
                                          confirmButtonText: this.confirmButtonText,
                                          autoClose: false},
            $el('h2', null, this.title, showPublishToggle
                ? $el('sup', null, ' (Luonnos)')
                : null),
            $el(ContentNodeFieldList, {key: this.state.cnode.id,
                                       cnode: this.state.cnode,
                                       ctype: this.state.ctype,
                                       ref: cmp => { if (cmp) this.fieldListCmp = cmp; }}),
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
            Object.assign({isPublished: this.state.cnode.isPublished,
                           isRevision: this.state.cnode.isRevision},
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
