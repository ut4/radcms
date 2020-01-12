import {services} from '../../../rad-commons.js';

class ContentRefPicker extends preact.Component {
    /**
     * @param {{value: string; onRefChange: (val: string) => any; contentType: string; valueField: string; labelField: string; [key: string]: any;}} props
     */
    constructor(props) {
        super(props);
        ['contentType', 'valueField', 'labelField'].forEach(key => {
            if (!props[key])
                throw new Error(`contentRef(${key}=something) is required`);
        });
        this.valueField = props.valueField;
        this.labelField = props.labelField;
        this.state = {contentNodes: [], selectedVal: props.value, values: []};
    }
    /**
     * @access protected
     */
    componentWillMount() {
        services.http.get(`/api/content/${this.props.contentType}`)
            .then(contentNodes => {
                // @allow Error
                this.validateFieldNames(contentNodes, this.props.contentType);
                this.setState({values: contentNodes.map(cnode => cnode[this.valueField]),
                               contentNodes});
            })
            .catch(err => {
                window.console.error(err);
            });
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null,
            $el('select', {value: this.state.selectedVal,
                           onChange: e => this.receiveSelection(e)},
                $el('option', {value: ''}, ' - '),
                this.state.values.map((value, i) =>
                    $el('option', {value},
                        this.state.contentNodes[i][this.labelField])
                ))
        );
    }
    /**
     * @access private
     */
    receiveSelection(e) {
        this.setState({selectedVal: e.target.value});
        this.props.onRefChange(e.target.value);
    }
    /**
     * @access private
     */
    validateFieldNames(contentNodes, contentTypeName) {
        if (contentNodes.length) {
            [this.valueField, this.labelField].forEach((field, i) => {
                if (!contentNodes[0].hasOwnProperty(field))
                    throw new Error(`${!i?'Value':'Label'}field ${contentTypeName}.${field} doesn't exist`);
            });
        }
    }
}

export default ContentRefPicker;
