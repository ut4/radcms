class ContentTypeDropdown extends preact.Component {
    /**
     * @param {{contentTypes: Array<ContentType>; onSelected: (type: ContentType|null) => any;}}
     */
    constructor(props) {
        super(props);
        this.state = {selectedContentTypeName: props.initialValue || ''};
    }
    /**
     * @access protected
     */
    render() {
        const {contentTypes} = this.props;
        return <select
            value={ this.state.selectedContentTypeName }
            onChange={ e => {
                this.props.onSelected(contentTypes.find(t => t.name === e.target.value));
                this.setState({selectedContentTypeName: e.target.value});
            } }>{ contentTypes.map(type =>
            <option value={ type.name }>{ type.friendlyName }</option>
        ) }</select>;
    }
}

export default ContentTypeDropdown;
