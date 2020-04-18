import {hookForm, InputGroup2, Input2} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';

class TextFieldFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.inputName = props.field.name;
        this.state = hookForm(this, {[this.inputName]: this.fixedInitialValue});
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return '...';
    }
    /**
     * @access protected
     */
    getInputImplClass() {
        return Input2;
    }
    /**
     * @access protected
     */
    render() {
        const InputImplClass = this.getInputImplClass();
        return <InputGroup2 classes={ this.state.classes[this.inputName] }>
            <label htmlFor={ this.inputName }>{ this.label }</label>
            <InputImplClass vm={ this }
                            myOnChange={ newState => this.emitValueChange(newState) }
                            name={ this.inputName }
                            id={ this.inputName }/>
        </InputGroup2>;
    }
    /**
     * @access private
     */
    emitValueChange(newState) {
        this.props.onValueChange(newState.values[this.inputName]);
        return newState;
    }
}

export default TextFieldFieldWidget;
