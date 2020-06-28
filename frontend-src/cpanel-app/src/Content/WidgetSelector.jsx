import {InputGroup} from '@rad-commons';
import {getSettingsEditForm, widgetTypes} from './FieldWidgets/all.js';

class WidgetSelector extends preact.Component {
    /**
     * @param {{widget: FieldWidget; widgetTypes?: Array<Object>;}} props
     */
    constructor(props) {
        super(props);
        this.state = {selectedWidgetName: props.widget.name};
        this.widgetTypes = props.widgetTypes || widgetTypes;
        this.settingsEditForm = preact.createRef();
    }
    /**
     * @returns {FieldWidget}
     * @access public
     */
    getResult() {
        return {
            name: this.state.selectedWidgetName,
            args: !this.settingsEditForm.current ? this.props.widget.args
                : this.settingsEditForm.current.getResult(),
        };
    }
    /**
     * @access protected
     */
    render({widget}, {selectedWidgetName}) {
        const WidgetSettingsForm = getSettingsEditForm(selectedWidgetName);
        return <>
            <InputGroup>
                <label class="form-label">Widgetti</label>
                <select
                    value={ selectedWidgetName }
                    onChange={ e => this.setState({selectedWidgetName: e.target.value}) }
                    class="form-select">{ this.widgetTypes.map(w =>
                    <option value={ w.name }>{ w.friendlyName }</option>
                ) }</select>
            </InputGroup>
            { !WidgetSettingsForm
                ? null
                : <div class="indented-content mt-8">
                    <WidgetSettingsForm
                        settings={ selectedWidgetName !== widget.name
                            ? null // Käytä oletuksia
                            : widget.args }
                        ref={ this.settingsEditForm }/>
                </div>
            }
        </>;
    }
}

export default WidgetSelector;
