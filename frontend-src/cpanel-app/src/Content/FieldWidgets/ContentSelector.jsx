import {http, InputGroup, Select} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';

class ContentSelectorFieldWidget extends BaseFieldWidget {
    /**
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        ['contentType', 'valueField', 'labelField'].forEach(key => {
            if (!props.field.args || !props.field.args[key])
                throw new Error(`contentSelector.args.${key} is required`);
        });
        this.valueField = props.field.args.valueField;
        this.labelField = props.field.args.labelField;
        this.contentNodes = [];
        this.state = {selectedVal: props.initialValue, values: []};
    }
    /**
     * @access protected
     */
    componentWillMount() {
        const contentTypeName = this.props.field.args.contentType;
        http.get(`/api/content/${contentTypeName}`)
            .then(contentNodes => {
                // @allow Error
                this.validateFieldNames(contentNodes, contentTypeName);
                this.contentNodes = contentNodes;
                this.setState({values: contentNodes.map(cnode => cnode[this.valueField])});
            })
            .catch(err => {
                window.console.error(err);
            });
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup label={ this.label }>
            <Select value={ this.state.selectedVal }
                    onChange={ e => this.receiveSelection(e) }>
                <option value=""> - </option>
                { this.state.values.map((value, i) => <option value={ value }>
                    { this.contentNodes[i][this.labelField] }
                </option>) }
            </Select>
        </InputGroup>;
    }
    /**
     * @access private
     */
    receiveSelection(e) {
        this.setState({selectedVal: e.target.value});
        this.props.onValueChange(e.target.value);
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
