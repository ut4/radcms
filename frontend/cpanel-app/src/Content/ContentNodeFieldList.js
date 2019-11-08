class ContentNodeFieldList extends preact.Component {
    /**
     * @param {{ctype: Object; cnode: Object;}} props
     */
    constructor(props) {
        super(props);
        if (typeof props.cnode != 'object')
            throw new TypeError('props.cnode must be an object');
        if (typeof props.ctype != 'object')
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
            $el('label', null,
                $el('span', null, field.name),
                this.makeInput(field)
            )
        ));
    }
    /**
     * @access private
     */
    makeInput(field) {
        let tagName = 'input';
        const props = {name: field.name,
                       type: 'text',
                       value: this.state.cnode[field.name],
                       onChange: e => this.setCnodeValue(e)};
        if (field.widget == 'image') {
            props.type = 'file';
        } else if (field.widget == 'wysiwyg') {
            tagName = 'textarea';
            delete props.type;
        }
        return $el(tagName, props);
    }
    /**
     * @access private
     */
    setCnodeValue(e) {
        this.state.cnode[e.target.name] = e.target.value;
    }
}

export default ContentNodeFieldList;
