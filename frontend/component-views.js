import {Form} from './common-components.js';
import services from './common-services.js';

class AddComponentView extends preact.Component {
    /**
     * @param {Object} props {
     *     initialComponentTypeName?: string;
     * }
     */
    constructor(props) {
        super(props);
        this.state = {
            name: '',
            selectedCmpType: null,
            componentTypes: []
        };
        services.myFetch('/api/component-type').then(
            res => {
                let newState = {
                    componentTypes: JSON.parse(res.responseText),
                    selectedCmpType: null
                };
                if (props.initialComponentTypeName) {
                    newState.selectedCmpType = newState.componentTypes.find(
                        t => t.name === props.initialComponentTypeName
                    );
                }
                if (!newState.selectedCmpType) {
                    newState.selectedCmpType = newState.componentTypes[0];
                }
                this.setState(newState);
            },
            () => { toast('Failed to fetch component types. Maybe refreshing ' +
                          'the page will help?', 'error'); }
        );
    }
    render() {
        if (!this.state.selectedCmpType) return null;
        return $el('div', {className: 'view'}, $el('div', null,
            $el(Form, {onConfirm: e => this.confirm(e)},
                [
                    $el('h2', null, 'Add component'),
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
                            value: this.state.componentTypes.indexOf(this.state.selectedCmpType),
                            onChange: e => this.receiveCmpTypeSelection(e)
                        }, this.state.componentTypes.map((type, i) =>
                            $el('option', {value: i}, type.name)
                        ))
                    ]),
                    this.getInputElsForCmpTypeProps(this.state.selectedCmpType.props),
                ]
            )
        ));
    }
    confirm(e) {
        return services.myFetch('/api/component', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'name=' + encodeURIComponent(this.state.name) +
                   '&json=' + encodeURIComponent(collectCmpKeyVals(this.state)) +
                   '&componentTypeName=' + encodeURIComponent(this.state.selectedCmpType.name)
        }).then(() => {
            myRedirect('/?rescan=1', true);
        }, () => {
            toast('Failed to create the component.', 'error');
        });
    }
    receiveInputValue(e) {
        this.setState({[e.target.name]: e.target.value});
    }
    receiveCmpTypeSelection(e) {
        this.setState({selectedCmpType: this.state.componentTypes[e.target.value]});
    }
    getInputElsForCmpTypeProps(props) {
        var inputEls = []
        for (var propName in props) {
            var stateKey = 'val-' + propName;
            if (!this.state.hasOwnProperty(stateKey)) {
                this.state[stateKey] = null;
            }
            inputEls.push($el('label', null, [
                $el('span', '', propName.toUpperCase()[0] + propName.substr(1)),
                $el(props[propName] == 'richtext' ? 'textarea' : 'input', {
                    name: stateKey,
                    value: this.state[stateKey],
                    onChange: e => this.receiveInputValue(e)
                }, null)
            ]));
        }
        return $el('div', null, inputEls);
    }
}
function collectCmpKeyVals(state) {
    var out = {};
    for (var propName in state.selectedCmpType.props) {
        out[propName] = state['val-' + propName];
    }
    return JSON.stringify(out);
}

class EditComponentView extends preact.Component {
    render() {
        return $el('div', {className: 'view'}, $el('div', null,
            $el('p', null, 'todo')
        ));
    }
}

export {AddComponentView, EditComponentView};
