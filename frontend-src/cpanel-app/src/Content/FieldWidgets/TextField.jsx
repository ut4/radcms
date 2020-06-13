import {hookForm, InputGroup, Input} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';

/**
 * Lyhyt tekstikenttä i.e. <input type="text"> -widgetti.
 */
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
        return Input;
    }
    /**
     * @access protected
     */
    render() {
        const InputImplClass = this.getInputImplClass();
        return <InputGroup classes={ this.state.classes[this.inputName] }>
            <label htmlFor={ this.inputName }>{ this.label }</label>
            <InputImplClass vm={ this }
                            myOnChange={ newState => this.emitValueChange(newState) }
                            name={ this.inputName }
                            id={ this.inputName }/>
        </InputGroup>;
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
