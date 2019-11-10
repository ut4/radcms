import services from '../../../src/common-services.js';
import {View, Form} from '../../../src/common-components.js';
import ContentNodeFieldList from './ContentNodeFieldList.js';

/**
 * #/edit-content/:id/:contentTypeName
 */
class ContentEditView extends preact.Component {
    /**
     * @param {{id: string; contentTypeName: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {
            cnode: null,
            ctype: null,
        };
        services.myFetch(`/api/content/${props.id}/${props.contentTypeName}`).then(
            res => {
                this.state.cnode = JSON.parse(res.responseText);
                return services.myFetch('/api/content-types/' + props.contentTypeName);
            },
            res => { toast(res.responseText, 'error'); }
        ).then(
            res => {
                this.state.ctype = JSON.parse(res.responseText);
                this.setState({cnode: this.state.cnode, ctype: this.state.ctype});
            },
            res => { toast(res.responseText, 'error'); }
        );
    }
    /**
     * @access private
     */
    render() {
        if (!this.state.ctype) return null;
        return $el(View, null, $el(Form, {onConfirm: e => this.handleFormSubmit(e)},
            $el('h2', null, 'Muokkaa sisältöä'),
            $el(ContentNodeFieldList, {cnode: this.state.cnode,
                                       ctype: this.state.ctype,
                                       ref: cmp => { if (cmp) this.fieldListCmp = cmp; }}, null)
        ));
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        return services.myFetch(`/api/content/${this.props.id}/${this.props.contentTypeName}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(this.fieldListCmp.getResult())
        }).then(() => {
            services.redirect(this.props.returnTo || '/', true);
        }, () => {
            toast('Sisällön tallennus epäonnistui.', 'error');
        });
    }
}

export default ContentEditView;
