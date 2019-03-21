import {Form} from './common-components.js';
import services from './common-services.js';

const EXTRA_FIELD_SEPARATOR = '__separator__';

class ContentNodeFieldList extends preact.Component {
    /**
     * @param {Object} props {
     *     fieldsInfo: {[string]: string;};
     *     fieldsData: {[string]: string;};
     * }
     */
    constructor(props) {
        super(props);
        if (typeof props.fieldsInfo != 'object')
            throw new TypeError('props.fieldsInfo must be an object');
        if (typeof props.fieldsData != 'object')
            throw new TypeError('props.fieldsData must be an object');
        this.dataTypes = [
            {name: 'text'},
            {name: 'richtext'},
        ];
        this.state = {
            fields: this.makeFields(props),
            openFieldName: null,
            openFieldDataType: null,
            openFieldIsNew: null,
        };
    }
    getFieldsData() {
        const out = {};
        this.state.fields.forEach(field => {
            const key = !field.isExtraField
                ? field.name
                : field.name + EXTRA_FIELD_SEPARATOR + field.dataType;
            out[key] = this.props.fieldsData[field.name];
        });
        return out;
    }
    render() {
        return $el('div', null,
            this.buildFieldEls(true), // own
            this.buildFieldEls(false), // extra
            this.buildFormEls()
        );
    }
    componentWillReceiveProps(props) {
        if (Object.keys(props.fieldsInfo).join() !=
            Object.keys(this.props.fieldsInfo).join()) {
            this.setState({fields: this.makeFields(props)});
        }
    }
    makeFields(props) {
        const out = [];
        for (const key in props.fieldsData) {
            if (key.indexOf(EXTRA_FIELD_SEPARATOR) < 0) {
                out.push({name: key, dataType: props.fieldsInfo[key] || null,
                          isExtraField: false});
            } else {
                const [name, dataType] = key.split(EXTRA_FIELD_SEPARATOR);
                props.fieldsData[name] = props.fieldsData[key];
                out.push({name, dataType, isExtraField: true});
            }
        }
        return out;
    }
    buildFieldEls(ownFields) {
        let inputEls = [];
        const makeInput = field => {
            let props = {
                name: field.name,
                value: this.props.fieldsData[field.name],
                onChange: e => this.receiveFieldValue(e)
            };
            if (field.dataType == 'richtext') return $el('textarea', props, null);
            return $el('input', props, null);
        };
        this.state.fields.forEach(field => {
            if (field.isExtraField === ownFields ||
                this.state.openFieldName == field.name) return;
            inputEls.push($el('label', null,
                $el('span', null,
                    field.name.toUpperCase()[0] + field.name.substr(1),
                    ...(field.isExtraField ? [
                        $el('button', {type: 'button',
                                       onClick: () => {
                                           this.setOpenField(field);
                                       }}, 'e'),
                        $el('button', {type: 'button',
                                       onClick: () => {
                                           this.removeExtraField(field.name);
                                       }}, 'x'),
                    ] : [])
                ),
                makeInput(field)
            ));
        });
        return $el('div', null, inputEls);
    }
    buildFormEls() {
        let content = null;
        if (this.state.openFieldDataType) {
            content = [
                $el('input', {name: 'openFieldName',
                              placeholder: 'fieldname',
                              onInput: e => Form.receiveInputValue(e, this),
                              value: this.state.openFieldName}, null),
                $el('label', null,
                    $el('select', {name: 'openFieldDataType',
                                   onChange: e => Form.receiveInputValue(e, this),
                                   value: this.state.openFieldDataType},
                        this.dataTypes.map(type =>
                            $el('option', {value: type.name}, type.name)
                        ))
                ),
                $el('button', {type: 'button',
                               onClick: () => { this.confirmExtraFieldForm(); },
                               disabled: this.state.openFieldName.length == 0}, 'Ok'),
                $el('button', {type: 'button',
                               onClick: () => { this.closeExtraFieldForm(); }}, 'Cancel')
            ];
        } else {
            content = [
                $el('button', {type: 'button',
                               onClick: () => { this.setOpenField(); }},
                    'Add field (for devs)')
            ];
        }
        return $el('div', {className: 'extra-field-form' + (!this.state.openFieldDataType ? '' : ' open')}, content);
    }
    setOpenField(field) {
        this.setState(!field
            ? {openFieldName: '', openFieldDataType: this.dataTypes[0].name,
               openFieldIsNew: true}
            : {openFieldName: field.name, openFieldDataType: field.dataType,
               openFieldIsNew: false}
        );
    }
    receiveFieldValue(e) {
        this.props.fieldsData[e.target.name] = e.target.value;
    }
    confirmExtraFieldForm() {
        if (this.state.openFieldIsNew) {
            this.state.fields.push({name: this.state.openFieldName,
                                    dataType: this.state.openFieldDataType,
                                    isExtraField: true});
        } else {
            const field = this.state.fields.find(f => f.name == this.state.openFieldName);
            field.name = this.state.openFieldName;
            field.dataType = this.state.openFieldDataType;
        }
        this.closeExtraFieldForm(this.state.fields);
    }
    closeExtraFieldForm(fields) {
        const newState = {openFieldName: null, openFieldDataType: null,
                          openFieldIsNew: null};
        if (fields) newState.fields = fields;
        this.setState(newState);
    }
    removeExtraField(name) {
        this.setState({fields: this.state.fields.filter(f => f.name != name)});
    }
}

/**
 * #/add-content[/:initialComponentTypeName?returnto=<url>]
 */
class AddContentView extends preact.Component {
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
            cnodeContentTypeName: '',
            fieldsData: null,
            selectedContentType: null,
            contentTypes: []
        };
        services.myFetch('/api/content-type').then(
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
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {onConfirm: e => this.confirm(e)},
                $el('h2', null, 'Add content'),
                $el('label', null,
                    $el('span', null, 'Nimi'),
                    $el('input', {
                        name: 'cnodeName',
                        value: this.state.cnodeName,
                        onChange: e => Form.receiveInputValue(e, this)
                    }, null)
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
            )
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
        this.state.cnodeContentTypeName = this.state.selectedContentType.name;
        return sendCnodeToBackend('POST', this, this.props.returnTo);
    }
}

/**
 * #/edit-content/:contentNodeId
 */
class EditContentView extends preact.Component {
    /**
     * @param {Object} props {
     *     contentNodeId: string;
     * }
     */
    constructor(props) {
        super(props);
        this.state = {
            cnodeName: '',
            cnodeContentTypeName: '',
            fieldsData: null, // {title: 'Article 1', body:'Lorem ipsum'...}
            fieldsInfo: null  // {title: 'text', body: 'richtext'...}
        };
        services.myFetch('/api/content/' + props.contentNodeId).then(
            res => {
                const contentNode = JSON.parse(res.responseText);
                this.state.cnodeName = contentNode.name;
                this.state.cnodeContentTypeName = contentNode.contentTypeName;
                this.state.fieldsData = JSON.parse(contentNode.json);
                return services.myFetch('/api/content-type/' + contentNode.contentTypeName);
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
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {onConfirm: e => this.confirm(e)},
                $el('h2', null, 'Edit content'),
                $el(ContentNodeFieldList, {fieldsData: this.state.fieldsData,
                                           fieldsInfo: this.state.fieldsInfo,
                                           ref: cmp => { this.fieldListCmp = cmp; }}, null)
            )
        ));
    }
    confirm() {
        return sendCnodeToBackend('PUT', this, this.props.returnTo);
    }
}

function sendCnodeToBackend(method, self) {
    return services.myFetch('/api/content', {
        method: method,
        headers: {'Content-Type': 'application/json'},
        data: JSON.stringify({
            name: self.state.cnodeName,
            json: JSON.stringify(self.fieldListCmp.getFieldsData()),
            contentTypeName: self.state.cnodeContentTypeName
        })
    }).then(() => {
        myRedirect((self.props.returnTo || '/') + '?rescan=full', true);
    }, () => {
        toast('Failed to create the content.', 'error');
    });
}

export {AddContentView, EditContentView};
