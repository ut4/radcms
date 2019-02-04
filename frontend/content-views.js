import {Form} from './common-components.js';
import services from './common-services.js';

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
        this.state = {
            contentNode: {name: '', contentTypeName: ''},
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
            $el(Form, {onConfirm: e => this.confirm(e)}, [
                $el('h2', null, 'Add content'),
                $el('label', null, [
                    $el('span', null, 'Nimi'),
                    $el('input', {
                        name: 'defs.name',
                        value: this.state.contentNode.name,
                        onChange: e => this.receiveInputValue(e)
                    }, null)
                ]),
                $el('label', null, [
                    $el('span', null, 'Tyyppi'),
                    $el('select', {
                        value: this.state.contentTypes.indexOf(this.state.selectedContentType),
                        onChange: e => this.receiveContentTypeSelection(e)
                    }, this.state.contentTypes.map((type, i) =>
                        $el('option', {value: i}, type.name)
                    ))
                ]),
                buildFieldInputEls(this, this.state.selectedContentType.fields),
            ])
        ));
    }
    receiveInputValue(e) {
        if (e.target.name != 'defs.name') {
            this.state.fieldsData[e.target.name] = e.target.value;
            this.setState({fieldsData: this.state.fieldsData});
        } else {
            this.state.contentNode[e.target.name.split('.').pop()] = e.target.value;
            this.setState({contentNode: this.state.contentNode});
        }
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
        this.state.contentNode.contentTypeName = this.state.selectedContentType.name;
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
            contentNode: null,
            fieldsData: null, // {title: 'Article 1', body:'Lorem ipsum'...}
            fieldsInfo: null  // {title: 'text', body: 'richtext'...}
        };
        services.myFetch('/api/content/' + props.contentNodeId).then(
            res => {
                this.state.contentNode = JSON.parse(res.responseText);
                this.state.fieldsData = JSON.parse(this.state.contentNode.json);
                return services.myFetch('/api/content-type/' + this.state.contentNode.contentTypeName);
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
        if (!this.state.contentNode) return null;
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {onConfirm: e => this.confirm(e)}, [
                $el('h2', null, 'Edit content')
            ].concat(buildFieldInputEls(this, this.state.fieldsInfo)))
        ));
    }
    receiveInputValue(e) {
        let fields = this.state.fieldsData;
        fields[e.target.name] = e.target.value;
        this.setState({fieldsData: fields});
    }
    confirm() {
        return sendCnodeToBackend('PUT', this, this.props.returnTo);
    }
}

function buildFieldInputEls(self, fieldsInfo) {
    let inputEls = [];
    for (let name in fieldsInfo) {
        inputEls.push($el('label', null, [
            $el('span', '', name.toUpperCase()[0] + name.substr(1)),
            $el(fieldsInfo[name] == 'richtext' ? 'textarea' : 'input', {
                name: name,
                value: self.state.fieldsData[name],
                onChange: e => self.receiveInputValue(e)
            }, null)
        ]));
    }
    return $el('div', null, inputEls);
}

function sendCnodeToBackend(method, self) {
    return services.myFetch('/api/content', {
        method: method,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        data: 'name=' + encodeURIComponent(self.state.contentNode.name) +
              '&json=' + encodeURIComponent(JSON.stringify(self.state.fieldsData)) +
              '&contentTypeName=' + encodeURIComponent(self.state.contentNode.contentTypeName)
    }).then(() => {
        myRedirect((self.props.returnTo || '/') + '?rescan=full', true);
    }, () => {
        toast('Failed to create the content.', 'error');
    });
}

export {AddContentView, EditContentView};
