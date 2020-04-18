import {Textarea2} from '@rad-commons';
import TextFieldFieldWidget from './TextField.jsx';

class TextAreaFieldFieldWidget extends TextFieldFieldWidget {
    /**
     * @access protected
     */
    getInputImplClass() {
        return Textarea2;
    }
}

export default TextAreaFieldFieldWidget;
