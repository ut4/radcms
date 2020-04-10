import {InputGroup, Input} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';

class ColorPickerFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.state = {value: props.initialValue || '#33393e'};
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup label={ this.label }>
            <Input onInput={ e => this.emitValueChange(e.target.value) }
                    value={ this.state.value }
                    type="color"
                    id={ this.props.field.name }/>
            <span style={ `background-color:${this.state.value}` }>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </InputGroup>;
    }
    /**
     * @access private
     */
    emitValueChange(value) {
        this.setState({value});
        this.props.onValueChange(value);
    }
}

export default ColorPickerFieldWidget;
