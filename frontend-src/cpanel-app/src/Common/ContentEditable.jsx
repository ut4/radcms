class ContentEditable extends preact.Component {
    /**
     * @param {{onChange: any; value: string; className?: string;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    shouldComponentUpdate() {
        return false;
    }
    /**
     * @access protectced
     */
    render() {
        return <div contentEditable
                    dangerouslySetInnerHTML={ {__html: this.props.value} }
                    onInput={ e => this.emitChange(e.target) }
                    class={ 'contenteditable' + (this.props.className ? ` ${this.props.className}` : '') }></div>;
    }
    /**
     * @param {HTMLElement} e
     */
    emitChange(e) {
        this.props.onChange(e.textContent);
    }
}

export default ContentEditable;
