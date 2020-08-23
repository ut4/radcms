import {hookForm, Input} from '@rad-commons';
import BaseFieldWidget from '../Base.jsx';

/**
 * Widgetti, jolla voi voi valita värin i.e. <input type="color">.
 */
class ColorPickerFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.fieldName = props.field.name;
        this.state = hookForm(this, {[this.fieldName]: this.fixedInitialValue});
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return '#33393e';
    }
    /**
     * @access protected
     */
    render() {
        return <Input
            vm={ this }
            type="color"
            name={ this.fieldName }
            id={ this.fieldName }
            myOnChange={ newState => this.emitValueChange(newState) }/>;
    }
    /**
     * @access private
     */
    emitValueChange(newState) {
        this.props.onValueChange(newState.values[this.fieldName]);
        return newState;
    }
}

export default ColorPickerFieldWidget;
