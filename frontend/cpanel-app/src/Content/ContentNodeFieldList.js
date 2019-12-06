import QuillEditor from '../Widgets/QuillEditor.js';

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
            $el('div', {class: 'label'},
                $el('label', {for: 'field-' + field.name}, field.friendlyName),
                this.makeInput(field)
            )
        ));
    }
    /**
     * @access private
     */
    makeInput(field) {
        let tagName = 'input';
        const props = {id: 'field-' + field.name,
                       name: field.name,
                       type: 'text',
                       value: this.state.cnode[field.name],
                       onInput: e => this.setCnodeValue(e)};
        if (field.widget === 'image') {
            props.type = 'file';
        } else if (field.widget === 'richtext') {
            return $el(QuillEditor, {
                name: props.name,
                value: props.value,
                onChange: html => {
                    this.setCnodeValue(html, field.name);
                }
            });
        }
        return $el(tagName, props);
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
