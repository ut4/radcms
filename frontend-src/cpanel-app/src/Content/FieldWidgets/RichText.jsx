import {InputGroup} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';
import QuillEditor from '../../Common/QuillEditor.jsx';
let counter = 0;

class RichTextFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        this.id = ++counter;
        if (props.initialValue === undefined) props.initialValue = '...';
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup label={ this.label }>
            <QuillEditor
                name={ `field-${this.id}` }
                value={ this.props.initialValue }
                onChange={ html => {
                    this.props.onValueChange(html);
                } }/>
        </InputGroup>;
    }
}

export default RichTextFieldWidget;
