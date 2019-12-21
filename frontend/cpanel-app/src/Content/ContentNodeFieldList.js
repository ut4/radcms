import makeWidgetComponent from '../Widgets/all.js';
import MultiFieldBuilder from '../Widgets/MultiFieldBuilder.js';

class ContentNodeFieldList extends preact.Component {
    /**
     * @param {{ctype: ContentType; cnode: ContentNode;}} props
     */
    constructor(props) {
        super(props);
        if (typeof props.cnode !== 'object')
            throw new TypeError('props.cnode must be an object');
        if (typeof props.ctype !== 'object')
            throw new TypeError('props.ctype must be an object');
        this.state = {
            cnode: JSON.parse(JSON.stringify(props.cnode)),
            ctype: props.ctype,
        };
    }
    /**
     * @access public
     */
    getResult() {
        return this.state.cnode;
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null, this.state.ctype.fields.map(field =>
            field.type !== 'hidden' && field.type !== 'multiFieldBuilder'
                ? $el('div', {class: 'label'},
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
            const value = this.state.cnode[field.name];
            return $el(MultiFieldBuilder, {
                fields: value ? JSON.parse(value) : [],
                onChange: (structure, rendered) => {
                    this.setCnodeValue(structure, field.name);
                    if (this.state.cnode.rendered)
                        this.setCnodeValue(rendered, 'rendered');
                }
            });
        }
        return $el(makeWidgetComponent(field.widget), {
            field: {id: field.name, value: this.state.cnode[field.name]},
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
            this.state.cnode[e.target.name] = e.target.value;
        else
            this.state.cnode[name] = e;
        this.setState({cnode: this.state.cnode});
    }
}

export default ContentNodeFieldList;
