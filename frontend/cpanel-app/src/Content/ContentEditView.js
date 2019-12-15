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
        const newState = {cnode: null, ctype: null, doPublish: !!props.doPublish};
        this.title = 'Muokkaa sisältöä';
        this.confirmButtonText = 'Tallenna';
        if (this.state.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.confirmButtonText = 'Julkaise';
        }
        services.myFetch(`/api/content/${props.id}/${props.contentTypeName}`).then(res => {
            newState.cnode = JSON.parse(res.responseText);
            return services.myFetch('/api/content-types/' + props.contentTypeName);
        })
        .then(res => {
            newState.ctype = JSON.parse(res.responseText);
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
                                          confirmButtonText: this.confirmButtonText},
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
        return services.myFetch(`/api/content/${this.props.id}/${this.props.contentTypeName}${revisionSettings}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(Object.assign({isPublished: this.state.cnode.isPublished,
                                                isRevision: this.state.cnode.isRevision},
                                               this.fieldListCmp.getResult()))
        }).then(() => {
            services.redirect(this.props.returnTo || '/', true);
        }, () => {
            toast('Sisällön tallennus epäonnistui.', 'error');
        });
    }
}

export default ContentEditView;
