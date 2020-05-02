import {FeatherSvg} from '@rad-commons';
import BaseFieldWidget from '../Base.jsx';
import MultiFieldConfigurer from './MultiFieldConfigurer.jsx';
import MultiFieldFieldsStore from './MultiFieldFieldsStore.js';
import getWidgetImpl, {widgetTypes} from '../all.js';

class MultiFieldFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.multiFieldFields = new MultiFieldFieldsStore(JSON.parse(this.fixedInitialValue));
        this.state = {fields: this.multiFieldFields.getFields(), configModeIsOn: false};
        this.multiFieldFields.listen(fields => {
            if (this.state.configModeIsOn) return;
            this.setState({fields});
        });
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return JSON.stringify([MultiFieldFieldsStore.makeField(widgetTypes[0])]);
    }
    /**
     * @access protected
     */
    render() {
        if (this.state.configModeIsOn)
            return <div class="multi-fields configurable">
                <button onClick={ () => {
                            const fields = this.multiFieldFields.getFields();
                            this.setState({fields, configModeIsOn: false});
                            this.props.onValueChange(JSON.stringify(fields));
                        } }
                        class="icon-button"
                        title="Lopeta muokkaus"
                        type="button"><FeatherSvg iconId="check"/></button>
                <MultiFieldConfigurer fields={ this.multiFieldFields }/>
            </div>;
        //
        const {showConfigureButton} = this.props.settings;
        return <div class={ 'multi-fields' + (showConfigureButton ? ' configurable' : '') }>
            { showConfigureButton
                ? <button onClick={ () => this.setState({configModeIsOn: true}) }
                        class="icon-button"
                        title="Muokkaa kenttiä"
                        type="button">
                    <FeatherSvg iconId="settings"/>
                </button>
                : null
            }
            { this.state.fields.map(f => {
                // @allow Error
                const {ImplClass, props} = getWidgetImpl(f.widget.name);
                return <ImplClass
                    key={ f.id }
                    field={ f }
                    initialValue={ f.value }
                    settings={ props }
                    onValueChange={ value => {
                        this.multiFieldFields.setFieldProps(f.id, {value});
                        this.props.onValueChange(JSON.stringify(this.multiFieldFields.getFields()));
                    }}/>;
            }) }
        </div>;
    }
}

export default MultiFieldFieldWidget;
