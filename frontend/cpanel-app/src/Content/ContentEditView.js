import services from '../../../src/common-services.js';
import {view, Form} from '../../../src/common-components.js';
import ContentNodeFieldList from './ContentNodeFieldList.js';

const EXTRA_FIELD_SEPARATOR = '__separator__';

/**
 * #/edit-content/:contentNodeId
 */
class ContentEditView extends preact.Component {
    /**
     * @param {Object} props {
     *     contentNodeId: string;
     * }
     */
    constructor(props) {
        super(props);
        this.state = {
            cnodeName: '',
            cnodeContentTypeId: '',
            fieldsData: null, // {title: 'Article 1', body:'Lorem ipsum'...}
            fieldsInfo: null  // {title: 'text', body: 'richtext'...}
        };
        services.myFetch('/api/content/' + props.contentNodeId).then(
            res => {
                const contentNode = JSON.parse(res.responseText);
                this.state.cnodeName = contentNode.name;
                this.state.cnodeContentTypeId = contentNode.contentTypeId;
                this.state.fieldsData = JSON.parse(contentNode.json);
                return services.myFetch('/api/content-types/' + contentNode.contentTypeId);
            },
            res => { toast(res.responseText, 'error'); }
        ).then(
            res => {
                this.state.fieldsInfo = JSON.parse(res.responseText).fields;
                this.setState(this.state);
            },
            res => { toast(res.responseText, 'error'); }
        );
    }
    render() {
        if (!this.state.fieldsInfo) return null;
        return view($el(Form, {onConfirm: e => this.confirm(e)},
            $el('h2', null, 'Edit content'),
            $el(ContentNodeFieldList, {fieldsData: this.state.fieldsData,
                                       fieldsInfo: this.state.fieldsInfo,
                                       ref: cmp => { this.fieldListCmp = cmp; }}, null)
        ));
    }
    confirm() {
        return services.myFetch('/api/content', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({
                name: this.state.cnodeName,
                json: JSON.stringify(this.fieldListCmp.getFieldsData()),
                contentTypeId: this.state.cnodeContentTypeId
            })
        }).then(() => {
            myRedirect(this.props.returnTo || '/', true);
        }, () => {
            toast('Failed to create the content.', 'error');
        });
    }
}

export default ContentEditView;
