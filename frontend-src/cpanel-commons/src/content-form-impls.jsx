const ContentFormImpl = Object.freeze({
    Default: 'Default',
});

class DefaultImpl extends preact.Component {
    /**
     * @param {{fields: Array<ContentTypeField>; contentNode: ContentNode; getWidgetImpl: (name: string) => {ImplClass: Object; props: ?Object;}|null; setContentNodeValue: (value: string, fieldName: string) => any; settings: Object;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        const {fields, settings, getWidgetImpl, contentNode, setContentNodeValue} = this.props;
        return <div>{ fields.map(f => {
            // TextFieldFieldWidget, TextAreaFieldWidget etc...
            const {ImplClass, props} = getWidgetImpl(f.widget.name);
            return <ImplClass
                field={ f }
                initialValue={ contentNode[f.name] }
                settings={ Object.assign({},
                    settings[`${f.widget.name}Props`] || {},
                    props
                ) }
                onValueChange={ value => {
                    setContentNodeValue(value, f.name);
                }}/>;
        }) }</div>;
    }
}

export {ContentFormImpl, DefaultImpl};
