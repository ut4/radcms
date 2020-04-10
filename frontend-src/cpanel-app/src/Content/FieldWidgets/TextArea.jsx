import {Textarea} from '@rad-commons';
import TextFieldFieldWidget from './TextField.jsx';

class TextAreaFieldFieldWidget extends TextFieldFieldWidget {
    /**
     * @access protected
     */
    getInputImplClass() {
        return Textarea;
    }
}

export default TextAreaFieldFieldWidget;
