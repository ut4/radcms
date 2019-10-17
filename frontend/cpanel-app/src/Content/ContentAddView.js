import services from '../../../src/common-services.js';
import {view, Form} from '../../../src/common-components.js';

/**
 * #/add-content[/:initialComponentTypeName?returnto=<url>]
 */
class ContentAddView extends preact.Component {
    /**
     * @param {Object} props {
     *     initialContentTypeName?: string;
     *     returnTo?: string;
     * }
     */
    constructor(props) {
        super(props);
        this.fieldListCmp = null;
        this.state = {
            cnodeName: '',
            cnodeContentTypeId: 0,
            fieldsData: null,
            selectedContentType: null,
            contentTypes: []
        };
        services.myFetch('/api/content-types').then(
            res => {
                let newState = {
                    contentTypes: JSON.parse(res.responseText),
                    fieldsData: {},
                    selectedContentType: null
                };
                if (props.initialContentTypeName) {
                    newState.selectedContentType = newState.contentTypes.find(
                        t => t.name === props.initialContentTypeName
                    );
                }
                if (!newState.selectedContentType) {
                    newState.selectedContentType = newState.contentTypes[0];
                }
                for (let name in newState.selectedContentType.fields) {
                    newState.fieldsData[name] = '';
                }
                this.setState(newState);
            },
            () => { toast('Failed to fetch content types. Maybe refreshing ' +
                          'the page will help?', 'error'); }
        );
    }
    render() {
        if (!this.state.selectedContentType) return null;
        return view($el(Form, {onConfirm: e => this.confirm(e)},
            $el('h2', null, 'Add content'),
            $el('label', null,
                $el('span', null, 'Nimi'),
                $el('input', {name: 'cnodeName',
                              value: this.state.cnodeName,
                              onChange: e => Form.receiveInputValue(e, this)}, null)
            ),
            $el('label', null,
                $el('span', {'data-help-text': 'Dev note: Voit luoda uusia sisältötyyppejä muokkaamalla site.ini-tiedostoa.'}, 'Tyyppi'),
                $el('select', {onChange: e => this.receiveContentTypeSelection(e),
                               value: this.state.contentTypes.indexOf(this.state.selectedContentType)},
                    this.state.contentTypes.map((type, i) =>
                        $el('option', {value: i}, type.name)
                    ))
            ),
            $el(ContentNodeFieldList, {fieldsData: this.state.fieldsData,
                                       fieldsInfo: this.state.selectedContentType.fields,
                                       ref: cmp => { this.fieldListCmp = cmp; }}, null)
        ));
    }
    receiveContentTypeSelection(e) {
        let newState = {selectedContentType: null, fieldsData: {}};
        newState.selectedContentType = this.state.contentTypes[e.target.value];
        for (let name in newState.selectedContentType.fields) {
            newState.fieldsData[name] = '';
        }
        this.setState(newState);
    }
    confirm() {
        this.state.cnodeContentTypeId = this.state.selectedContentType.id;
        return services.myFetch('/api/content', {
            method: 'POST',
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

export default ContentAddView;
