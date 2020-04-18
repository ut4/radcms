import {http, hookForm, InputGroup2, Select2} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';

class ContentSelectorFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        const widget = props.field.widget;
        ['contentType', 'valueField', 'labelField'].forEach(key => {
            if (!widget.args || !widget.args[key])
                throw new Error(`contentSelector.args.${key} is required`);
        });
        this.valueField = widget.args.valueField;
        this.labelField = widget.args.labelField;
        this.contentNodes = [];
        this.fieldName = props.field.name;
        this.state = Object.assign(hookForm(this, {[this.fieldName]: this.fixedInitialValue}),
                                   {options: []});
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
        return '';
    }
    /**
     * @access protected
     */
    componentWillMount() {
        const contentTypeName = this.props.field.widget.args.contentType;
        http.get(`/api/content/${contentTypeName}`)
            .then(contentNodes => {
                // @allow Error
                this.validateFieldNames(contentNodes, contentTypeName);
                this.contentNodes = contentNodes;
                this.setState({options: contentNodes.map(cnode => cnode[this.valueField])});
            })
            .catch(err => {
                window.console.error(err);
            });
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup2 classes={ this.state.classes[this.fieldName] }>
            <label htmlFor={ this.fieldName }>{ this.label }</label>
            <Select2 vm={ this } name={ this.fieldName } id={ this.fieldName }
                     myOnChange={ newState => this.receiveSelection(newState) }>
                <option value=""> - </option>
                { this.state.options.map((value, i) => <option value={ value }>
                    { this.contentNodes[i][this.labelField] }
                </option>) }
            </Select2>
        </InputGroup2>;
    }
    /**
     * @access private
     */
    receiveSelection(newState) {
        this.props.onValueChange(newState.values[this.fieldName]);
        return newState;
    }
    /**
     * @access private
     */
    validateFieldNames(contentNodes, contentTypeName) {
        if (contentNodes.length) {
            [this.valueField, this.labelField].forEach((field, i) => {
                if (!contentNodes[0][field])
                    throw new Error(`${!i?'Value':'Label'}field ${contentTypeName}.${field} doesn't exist`);
            });
        }
    }
}

export default ContentSelectorFieldWidget;
