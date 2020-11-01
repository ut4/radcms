import {FeatherSvg, env} from '@rad-commons';
import {contentFormRegister, FieldsFilter} from '@rad-cpanel-commons';
import BaseFieldWidget from '../Base.jsx';
import MultiFieldConfigurer from './MultiFieldConfigurer.jsx';
import MultiFieldFieldsStore from './MultiFieldFieldsStore.js';
import getWidgetImpl, {widgetTypes} from '../all.js';
const DefaultFormImpl = contentFormRegister.getImpl('Default');

/**
 * Widgetti, jolla voi rakentaa kustomoitua sisältöä, jossa useita erityyppisiä
 * kenttiä. Widgetin arvo serialisoidaan ja tallennetaan tietokantaan yhtenä
 * JSON-merkkijonona.
 */
class MultiFieldFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.isConfigurable = props.settings.showConfigureButton;
        this.multiFieldFields = new MultiFieldFieldsStore(
            getValidInitialFieldsOrWarn(props.initialValue));
        this.multiFieldFields.listen(fieldsBundle => {
            if (this.state.configModeIsOn) return;
            this.setState({fieldsBundle});
        });
        this.fieldsFilter = new FieldsFilter(props.settings.fieldsToDisplay);
        const fieldsBundle = this.multiFieldFields.getFields();
        this.values = makeVirtualContentNode(fieldsBundle);
        this.setState({fieldsBundle, visibleFieldMetas: this.makeVisibleFieldMetas(fieldsBundle),
                       configModeIsOn: false});
    }
    /**
     * @returns {string}
     * @access protected
     */
    static getInitialValue() {
        const parts = MultiFieldFieldsStore.makeNewField(widgetTypes[0]);
        return JSON.stringify({__fields: [parts.meta], [parts.meta.name]: parts.value});
    }
    /**
     * @inheritdoc
     */
    static convert(_previous, _newWidget, _value) {
        return null;
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        const fieldsToDisplay = props.settings.fieldsToDisplay || [];
        if (fieldsToDisplay.join() !== this.fieldsFilter.getFieldsToDisplay().join()) {
            this.fieldsFilter = new FieldsFilter(fieldsToDisplay);
            this.setState({visibleFieldMetas: this.makeVisibleFieldMetas(this.state.fieldsBundle)});
        }
    }
    /**
     * @access protected
     */
    render() {
        if (this.state.configModeIsOn)
            return <div class="multi-fields indented-content configurable">
                <button onClick={ () => this.endConfigMode() }
                        class="btn btn-icon btn-sm with-icon"
                        title="Tallenna rakenne"
                        type="button">
                            <FeatherSvg iconId="check" className="feather-sm"/>
                           Tallenna rakenne
                    </button>
                <MultiFieldConfigurer fields={ this.multiFieldFields }/>
            </div>;
        //
        return <div class={ 'multi-fields' + (this.isConfigurable ? ' indented-content configurable' : '') }>
            { this.isConfigurable
                ? <button onClick={ () => this.beginConfigMode() }
                        class="btn btn-icon btn-sm with-icon"
                        title="Muokkaa rakennetta"
                        type="button">
                    <FeatherSvg iconId="settings" className="feather-sm"/>
                    Muokkaa rakennetta
                </button>
                : null
            }
            <DefaultFormImpl
                fields={ this.state.visibleFieldMetas }
                values={ this.values }
                onValueChange={ (value, f) => {
                    this.multiFieldFields.setFieldProps(f.id, {value});
                    this.props.onValueChange(JSON.stringify(this.multiFieldFields.getFields()));
                } }
                fieldHints={ this.state.visibleFieldMetas.map(f =>
                    !this.isConfigurable || this.fieldsFilter.fieldShouldBeShown(f) ? null : '  Ei näytetä'
                ) }
                getWidgetImpl={ getWidgetImpl }
                settings={ {} }/>
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
        const fieldsBundle = this.multiFieldFields.getFields();
        this.values = makeVirtualContentNode(fieldsBundle);
        this.setState({fieldsBundle,
                       visibleFieldMetas: this.makeVisibleFieldMetas(fieldsBundle),
                       configModeIsOn: false});
        this.props.onValueChange(JSON.stringify(fieldsBundle));
        this.props.setFormClasses('');
    }
    /**
     * @access private
     */
    makeVisibleFieldMetas(fieldsBundle) {
        return this.isConfigurable ? fieldsBundle.__fields : this.fieldsFilter.doFilter(fieldsBundle.__fields);
    }
}

function makeVirtualContentNode(fieldsBundle) {
    const copy = Object.assign({}, fieldsBundle);
    delete copy.__fields;
    return copy;
}

function getValidInitialFieldsOrWarn(initialValue) {
    const candidate = JSON.parse(initialValue);
    if (candidate && typeof candidate === 'object' && Array.isArray(candidate.__fields))
        return candidate;
    env.console.error('Initial value of MultiField must be {__fields: Array, [key: string]: any}, is: ',
                      candidate);
    return [];
}

export default MultiFieldFieldWidget;
