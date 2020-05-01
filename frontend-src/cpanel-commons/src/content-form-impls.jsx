const ContentFormImpl = Object.freeze({
    Default: 'Default',
});

class DefaultImpl extends preact.Component {
    /**
     * @param {{fields: Array<ContentTypeField>; contentNode: ContentNode; getWidgetImpl: (name: string) => {ImplClass: Object; props: ?Object;}|null; setContentNodeValue: (value: string, fieldName: string) => any;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        const {fields, getWidgetImpl, contentNode, setContentNodeValue} = this.props;
        return <>{ fields.map(f => {
            // TextFieldFieldWidget, TextAreaFieldWidget etc...
            const {ImplClass, props} = getWidgetImpl(f.widget.name);
            return <ImplClass
                field={ f }
                initialValue={ contentNode[f.name] }
                settings={ props }
                onValueChange={ value => {
                    setContentNodeValue(value, f.name);
                }}/>;
        }) }</>;
    }
}

export {ContentFormImpl, DefaultImpl};
