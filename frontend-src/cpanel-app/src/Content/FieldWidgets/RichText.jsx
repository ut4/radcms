import {hookForm} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';
import QuillEditor from '../../Common/QuillEditor.jsx';
let counter = 0;

/**
 * Rikastetekstiwidgetti, käyttää Quill-editoria.
 */
class RichTextFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.fieldName = `field-${++counter}`;
        this.state = hookForm(this, {[this.fieldName]: this.fixedInitialValue});
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
    render() {
        return <QuillEditor
            name={ this.fieldName }
            value={ this.fixedInitialValue }
            onChange={ html => {
                this.form.triggerChange(html, this.fieldName);
                this.props.onValueChange(html);
            } }
            onBlur={ () => this.form.triggerBlur(this.fieldName) }/>;
    }
}

export default RichTextFieldWidget;
