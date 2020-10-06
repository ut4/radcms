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
            getValidInitialFieldsOrWarn(this.fixedInitialValue));
        this.multiFieldFields.listen(fields => {
            if (this.state.configModeIsOn) return;
            this.setState({fields});
        });
        this.fieldsFilter = new FieldsFilter(props.settings.fieldsToDisplay);
        const fields = this.multiFieldFields.getFields();
        this.values = makeVirtualContentNode(fields);
        this.setState({fields, visibleFields: this.makeVisibleFields(fields),
                       configModeIsOn: false});
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        const fieldsToDisplay = props.settings.fieldsToDisplay || [];
        if (fieldsToDisplay.join() !== this.fieldsFilter.getFieldsToDisplay().join()) {
            this.fieldsFilter = new FieldsFilter(fieldsToDisplay);
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
                fields={ this.state.visibleFields }
                values={ this.values }
                onValueChange={ (value, f) => {
                    this.multiFieldFields.setFieldProps(f.id, {value});
                    this.props.onValueChange(JSON.stringify(this.multiFieldFields.getFields()));
                } }
                fieldHints={ this.state.visibleFields.map(f =>
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
        const fields = this.multiFieldFields.getFields();
        this.values = makeVirtualContentNode(fields);
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
        return this.isConfigurable ? fields : this.fieldsFilter.doFilter(fields);
    }
}

function makeVirtualContentNode(fields) {
    return fields.reduce((obj, f) => {
        obj[f.name] = f.value;
        return obj;
    }, {});
}

function getValidInitialFieldsOrWarn(initialValue) {
    const candidate = JSON.parse(initialValue);
    if (Array.isArray(candidate))
        return candidate;
    env.console.error('Initial value of MultiField must be an array, is: ',
                      candidate);
    return [];
}

export default MultiFieldFieldWidget;
