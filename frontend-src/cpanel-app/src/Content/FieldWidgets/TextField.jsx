import {InputGroup, Input} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';

class TextFieldFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        if (props.initialValue === undefined) props.initialValue = '...';
        this.state = {value: props.initialValue};
    }
    /**
     * @access protected
     */
    getInputImplClass() {
        return Input;
    }
    /**
     * @access protected
     */
    render() {
        const InputImplClass = this.getInputImplClass();
        return <InputGroup label={ this.label }>
            <InputImplClass onInput={ e => this.emitValueChange(e.target.value) }
                    value={ this.state.value }
                    id={ this.props.field.name }/>
        </InputGroup>;
    }
    /**
     * @access private
     */
    emitValueChange(newValue) {
        this.setState({value: newValue});
        this.props.onValueChange(newValue);
    }
}

export default TextFieldFieldWidget;
