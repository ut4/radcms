import {hookForm, Input} from '@rad-commons';
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
        this.inputImplCmp = preact.createRef();
        this.isAutoresizeInitialized = false;
    }
    /**
     * @inheritdoc
     */
    static convert(previous, _newWidget, value) {
        return previous.group !== 'text' ? null : value;
    }
    /**
     * @inheritdoc
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
        const InputImplClass = this.getInputImplClass(); // Input, Textarea
        return <InputImplClass
            vm={ this }
            myOnChange={ newState => this.emitValueChange(newState) }
            name={ this.inputName }
            id={ this.inputName }
            ref={ this.onInputImplReferenced.bind(this) }/>;
    }
    /**
     * @access private
     */
    emitValueChange(newState) {
        this.props.onValueChange(newState.values[this.inputName]);
        return newState;
    }
    /**
     * @access private
     */
    onInputImplReferenced(cmp) {
        if (!cmp || !this.props.settings.autosize || this.isAutoresizeInitialized)
            return;
        this.isAutoresizeInitialized = true;
        setTimeout(() => {
            window.autosize(cmp.inputEl);
        }, 10);
    }
}

export default TextFieldFieldWidget;
