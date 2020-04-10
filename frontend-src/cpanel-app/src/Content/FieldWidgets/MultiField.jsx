import {FeatherSvg} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';
import MultiFieldConfigurer from '../MultiFieldConfigurer.jsx';
import getWidgetImpl, {widgetTypes} from './all.js';

class MultiFieldFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.idCounter = 0;
        if (props.initialValue) {
            this.virtualFields = JSON.parse(props.initialValue);
            this.idCounter = this.virtualFields.reduce((max, f) => f.id > max ? f.id : max, 0);
        } else {
            this.virtualFields = [this.makeField(widgetTypes[0])];
        }
        this.state = {configModeIsOn: false};
    }
    /**
     * @access protected
     */
    render() {
        if (this.state.configModeIsOn)
            return <MultiFieldConfigurer/>;
        //
        const {showConfigureButton} = this.props.settings;
        return <div class={ 'multi-fields' + (showConfigureButton ? ' configurable' : '') }>
            { showConfigureButton
                ? <button class="icon-button" type="button"
                        onClick={ () => this.setState({configModeIsOn: true}) }>
                    <FeatherSvg iconId="settings"/>
                </button>
                : null
            }
            { this.virtualFields.map((f, i) => {
                const {ImplClass, props} = getWidgetImpl(f.type);
                return <ImplClass
                    field={ f }
                    initialValue={ f.value }
                    settings={ props }
                    onValueChange={ value => {
                        this.virtualFields[i].value = value;
                        this.props.onValueChange(JSON.stringify(this.virtualFields));
                    }}/>;
            }) }
        </div>;
    }
    /**
     * @access private
     */
    makeField(type) {
        return {id: (++this.idCounter).toString(),
                type: type.name,
                name: `${type.name} #${(this.virtualFields || []).reduce(f =>
                           f.type === type.name ? 1 : 0, 1
                       )}`,
                value: ''};
    }
}

export default MultiFieldFieldWidget;
