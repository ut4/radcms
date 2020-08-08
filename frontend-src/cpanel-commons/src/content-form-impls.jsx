import FieldsFilter from './FieldsFilter.js';

const ContentFormImpl = Object.freeze({
    Default: 'Default',
});

class DefaultImpl extends preact.Component {
    /**
     * @param {{fields: Array<ContentTypeField>; setContentNodeValue: (value: string, fieldName: string) => any; editForm: ContentEditView; getWidgetImpl: (name: string) => {ImplClass: Object; props: ?Object;}|null; settings: Object;}} props
     */
    constructor(props) {
        super(props);
        this.componentWillReceiveProps(props);
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        this.visibleFields = (new FieldsFilter(props.settings.fieldsToDisplay))
            .doFilter(props.fields);
    }
    /**
     * @access protected
     */
    render({settings, getWidgetImpl, editForm, setContentNodeValue}) {
        return <div>{ this.visibleFields.map(f => {
            // TextFieldFieldWidget, TextAreaFieldWidget etc...
            const {ImplClass, props} = getWidgetImpl(f.widget.name);
            return <ImplClass
                field={ f }
                initialValue={ editForm.contentNode[f.name] }
                settings={ Object.assign({},
                    settings[`${f.widget.name}Props`] || {},
                    props
                ) }
                onValueChange={ value => {
                    setContentNodeValue(value, f.name);
                }}
                setFormClasses={ str => {
                    editForm.setState({formClasses: str.toString()});
                } }/>;
        }) }</div>;
    }
}

export {ContentFormImpl, DefaultImpl, FieldsFilter};
