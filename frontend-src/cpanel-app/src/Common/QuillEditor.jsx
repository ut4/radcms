class QuillEditor extends preact.Component {
    /**
     * @param {{name: string; value: string; onChange: (html: string) => any; onBlur?: () => any;}} props
     */
    constructor(props) {
        super(props);
        this.quill = null;
    }
    /**
     * @access protected
     */
    componentDidMount() {
        this.quill = new window.Quill('#editor-' + this.props.name, {
            modules: {toolbar: [
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{'list': 'ordered'}, {'list': 'bullet'}],
                [{'indent': '-1'}, {'indent': '+1'}, {'align': [] }],
                [{'header': [1, 2, 3, 4, 5, 6, false]}],
                ['link', 'image', 'video', 'code-block'],
                ['clean']
            ]},
            theme: 'snow'
        });
        this.quill.on('text-change', (_delta, _oldDelta, _source) => {
            if (this.quill.container.firstChild)
                this.props.onChange(this.quill.container.firstChild.innerHTML);
        });
        if (this.props.onBlur)
            this.quill.on('selection-change', range => {
                if (!range) this.props.onBlur();
            });
    }
    /**
     * @access protected
     */
    shouldComponentUpdate() {
        return false;
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <div id={ `editor-${this.props.name}` }
                 dangerouslySetInnerHTML={ {__html: this.props.value} }></div>
        </div>;
    }
}

export default QuillEditor;
