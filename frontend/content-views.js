import {Form} from './common-components.js';
import services from './common-services.js';

class AddContentView extends preact.Component {
    /**
     * @param {Object} props {
     *     initialContentTypeName?: string;
     * }
     */
    constructor(props) {
        super(props);
        this.state = {
            name: '',
            selectedContentType: null,
            contentTypes: []
        };
        services.myFetch('/api/content-type').then(
            res => {
                let newState = {
                    contentTypes: JSON.parse(res.responseText),
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
                [
                    $el('h2', null, 'Add content'),
                    $el('label', null, [
                        $el('span', null, 'Nimi'),
                        $el('input', {
                            name: 'name',
                            value: this.state.name,
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
                    this.getInputElsForContentTypeFields(this.state.selectedContentType.fields),
                ]
            )
        ));
    }
    confirm() {
        return services.myFetch('/api/content', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'name=' + encodeURIComponent(this.state.name) +
                  '&json=' + encodeURIComponent(collectContentNodeData(this.state)) +
                  '&contentTypeName=' + encodeURIComponent(this.state.selectedContentType.name)
        }).then(() => {
            myRedirect('/?rescan=1', true);
        }, () => {
            toast('Failed to create the content.', 'error');
        });
    }
    receiveInputValue(e) {
        this.setState({[e.target.name]: e.target.value});
    }
    receiveContentTypeSelection(e) {
        this.setState({selectedContentType: this.state.contentTypes[e.target.value]});
    }
    getInputElsForContentTypeFields(fields) {
        var inputEls = [];
        for (var name in fields) {
            var stateKey = 'val-' + name;
            if (!this.state.hasOwnProperty(stateKey)) {
                this.state[stateKey] = null;
            }
            inputEls.push($el('label', null, [
                $el('span', '', name.toUpperCase()[0] + name.substr(1)),
                $el(fields[name] == 'richtext' ? 'textarea' : 'input', {
                    name: stateKey,
                    value: this.state[stateKey],
                    onChange: e => this.receiveInputValue(e)
                }, null)
            ]));
        }
        return $el('div', null, inputEls);
    }
}
function collectContentNodeData(state) {
    var out = {};
    for (var name in state.selectedContentType.fields) {
        out[name] = state['val-' + name];
    }
    return JSON.stringify(out);
}

class EditContentView extends preact.Component {
    render() {
        return $el('div', {className: 'view'}, $el('div', null,
            $el('p', null, 'todo')
        ));
    }
}

export {AddContentView, EditContentView};
