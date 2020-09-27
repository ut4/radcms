import {Textarea} from '@rad-commons';
import TextFieldFieldWidget from './TextField.jsx';

/**
 * Pitkä tekstikenttä i.e. <textarea> -widgetti.
 */
class TextAreaFieldFieldWidget extends TextFieldFieldWidget {
    /**
     * @access protected
     */
    getInputImplClass() {
        return Textarea;
    }
}

export default TextAreaFieldFieldWidget;
