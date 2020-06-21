import {FeatherSvg} from '@rad-commons';
import {FieldsFilter} from '@rad-cpanel-commons';
import BaseFieldWidget from '../Base.jsx';
import MultiFieldConfigurer from './MultiFieldConfigurer.jsx';
import MultiFieldFieldsStore from './MultiFieldFieldsStore.js';
import getWidgetImpl, {widgetTypes} from '../all.js';

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
        this.multiFieldFields = new MultiFieldFieldsStore(JSON.parse(this.fixedInitialValue));
        this.multiFieldFields.listen(fields => {
            if (this.state.configModeIsOn) return;
            this.setState({fields});
        });
        this.fieldsFilter = new FieldsFilter(props.settings.fieldsToDisplay);
        const fields = this.multiFieldFields.getFields();
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
            return <div class="multi-fields configurable">
                <button onClick={ () => this.endConfigMode() }
                        class="btn btn-icon btn-sm columns col-centered ml-0"
                        title="Tallenna rakenne"
                        type="button">
                            <FeatherSvg iconId="check" className="feather-small"/>
                           <span class="ml-2">Tallenna rakenne</span>
                    </button>
                <MultiFieldConfigurer fields={ this.multiFieldFields }/>
            </div>;
        //
        return <div class={ 'multi-fields' + (this.isConfigurable ? ' configurable' : '') }>
            { this.isConfigurable
                ? <button onClick={ () => this.beginConfigMode() }
                        class="btn btn-icon btn-sm columns col-centered ml-0"
                        title="Muokkaa rakennetta"
                        type="button">
                    <FeatherSvg iconId="settings" className="feather-small"/>
                    <span class="ml-2">Muokkaa rakennetta</span>
                </button>
                : null
            }
            { this.state.visibleFields.map(f => {
                // @allow Error
                const {ImplClass, props} = getWidgetImpl(f.widget.name);
                const hint = !this.isConfigurable || this.fieldsFilter.fieldShouldBeShown(f) ? null : '  Ei näytetä';
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
        return this.isConfigurable ? fields : this.fieldsFilter.doFilter(fields);
    }
}

export default MultiFieldFieldWidget;
