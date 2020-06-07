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
        this.isConfigurable = props.settings.showConfigureButton;
        this.multiFieldFields = new MultiFieldFieldsStore(JSON.parse(this.fixedInitialValue));
        this.multiFieldFields.listen(fields => {
            if (this.state.configModeIsOn) return;
            this.setState({fields});
        });
        const fields = this.multiFieldFields.getFields();
        this.fieldsToDisplay = props.settings.fieldsToDisplay || [];
        this.setState({fields, visibleFields: this.makeVisibleFields(fields),
                       configModeIsOn: false});
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        const fieldsToDisplay = props.settings.fieldsToDisplay || [];
        if (fieldsToDisplay.join() !== this.fieldsToDisplay.join()) {
            this.fieldsToDisplay = fieldsToDisplay;
            this.setState({visibleFields: this.makeVisibleFields(this.state.fields)});
        }
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
                <button onClick={ () => this.endConfigMode() }
                        class="icon-button"
                        title="Tallenna rakenne"
                        type="button">
                            <FeatherSvg iconId="check"/>
                           <span>Tallenna rakenne</span>
                    </button>
                <MultiFieldConfigurer fields={ this.multiFieldFields }/>
            </div>;
        //
        return <div class={ 'multi-fields' + (this.isConfigurable ? ' configurable' : '') }>
            { this.isConfigurable
                ? <button onClick={ () => this.beginConfigMode() }
                        class="icon-button"
                        title="Muokkaa rakennetta"
                        type="button">
                    <FeatherSvg iconId="settings"/>
                    <span>Muokkaa rakennetta</span>
                </button>
                : null
            }
            { this.state.visibleFields.map(f => {
                // @allow Error
                const {ImplClass, props} = getWidgetImpl(f.widget.name);
                const hint = !this.isConfigurable || this.fieldShouldBeShown(f) ? null : '  Ei näytetä';
                return <ImplClass
                    key={ `${f.id}-${hint || '-'}` }
                    field={ f }
                    initialValue={ f.value }
                    settings={ props }
                    labelHint={ hint }
                    onValueChange={ value => {
                        this.multiFieldFields.setFieldProps(f.id, {value});
                        this.props.onValueChange(JSON.stringify(this.multiFieldFields.getFields()));
                    }}/>;
            }) }
        </div>;
    }
    /**
     * @access private
     */
    beginConfigMode() {
        this.setState({configModeIsOn: true});
        this.props.setFormClasses('with-configurable-fields');
    }
    /**
     * @access private
     */
    endConfigMode() {
        const fields = this.multiFieldFields.getFields();
        this.setState({fields,
                       visibleFields: this.makeVisibleFields(fields),
                       configModeIsOn: false});
        this.props.onValueChange(JSON.stringify(fields));
        this.props.setFormClasses('');
    }
    /**
     * @access private
     */
    makeVisibleFields(fields) {
        if (this.isConfigurable || !this.fieldsToDisplay.length) return fields;
        // validate
        this.fieldsToDisplay.forEach(name => {
            if (!fields.some(f => f.name === name))
                console.warn(`No multifield "${name}" found.`);
        });
        // filter
        return fields.filter(this.fieldShouldBeShown.bind(this));
    }
    /**
     * @access private
     */
    fieldShouldBeShown(field) {
        return !this.fieldsToDisplay.length || this.fieldsToDisplay.indexOf(field.name) > -1;
    }
}

export default MultiFieldFieldWidget;
