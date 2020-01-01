import makeWidgetComponent from '../Widgets/all.js';
import MultiFieldBuilder from '../Widgets/MultiFieldBuilder.js';

class ContentNodeFieldList extends preact.Component {
    /**
     * @param {{contentType: ContentType; contentNode: ContentNode;}} props
     */
    constructor(props) {
        super(props);
        if (typeof props.contentNode !== 'object')
            throw new TypeError('props.contentNode must be an object');
        if (typeof props.contentType !== 'object')
            throw new TypeError('props.contentType must be an object');
        this.state = {
            contentNode: JSON.parse(JSON.stringify(props.contentNode)),
            contentType: props.contentType,
        };
    }
    /**
     * @access public
     */
    getResult() {
        return this.state.contentNode;
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null, this.state.contentType.fields.map(field =>
            field.type !== 'hidden' && field.type !== 'multiFieldBuilder'
                ? $el('div', {className: 'label'},
                    $el('label', {for: 'field-' + field.name}, field.friendlyName),
                    this.makeInput(field)
                )
                : this.makeInput(field)
        ));
    }
    /**
     * @access private
     */
    makeInput(field) {
        if (field.widget === 'hidden') {
            return null;
        }
        if (field.widget === 'multiFieldBuilder') {
            const value = this.state.contentNode[field.name];
            return $el(MultiFieldBuilder, {
                fields: value ? JSON.parse(value) : [],
                onChange: (structure, rendered) => {
                    this.setCnodeValue(structure, field.name);
                    if (this.state.contentNode.rendered)
                        this.setCnodeValue(rendered, 'rendered');
                }
            });
        }
        return $el(makeWidgetComponent(field.widget), {
            field: {id: field.name, value: this.state.contentNode[field.name]},
            fieldInfo: field,
            onChange: val => {
                this.setCnodeValue(val, field.name);
            }
        });
    }
    /**
     * @access private
     */
    setCnodeValue(e, name) {
        if (!name)
            this.state.contentNode[e.target.name] = e.target.value;
        else
            this.state.contentNode[name] = e;
        this.setState({contentNode: this.state.contentNode});
    }
}

export default ContentNodeFieldList;
