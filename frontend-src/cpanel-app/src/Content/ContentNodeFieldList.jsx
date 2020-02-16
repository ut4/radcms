import {InputGroup, config} from '@rad-commons';
import makeWidgetComponent from '../Widgets/all.jsx';
import MultiFieldBuilder from '../Widgets/MultiFieldBuilder.jsx';
import ContentRefPicker from '../Widgets/ContentRefPicker.jsx';

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
        return <div>{ this.state.contentType.fields.map(field =>
            field.widget.name !== 'hidden' && field.widget.name !== 'multiFieldBuilder'
                ? <InputGroup label={ field.friendlyName }>
                    { this.makeInput(field) }
                </InputGroup>
                : this.makeInput(field)
        ) }</div>;
    }
    /**
     * @access private
     */
    makeInput(field) {
        const widgetName = field.widget.name;
        if (widgetName === 'hidden') {
            return null;
        }
        const value = this.state.contentNode[field.name];
        const applyWidgetValue = val => {
            this.setCnodeValue(val, field.name);
        };
        if (widgetName === 'multiFieldBuilder') {
            return <MultiFieldBuilder
                    fields={ value ? JSON.parse(value) : [] }
                    enableFieldEditing={ config.userPermissions.canManageFieldsOfMultiFieldContent }
                    onChange={ (structure, rendered) => {
                        applyWidgetValue(structure);
                        if (this.state.contentNode.rendered)
                            this.setCnodeValue(rendered, 'rendered');
                    } }/>;
        }
        if (widgetName === 'contentRef') {
            return preact.createElement(ContentRefPicker, Object.assign({},
                {value, onRefChange: applyWidgetValue},
                field.widget.args
            ));
        }
        return preact.createElement(makeWidgetComponent(widgetName), {
            args: field.widget.args,
            field: {id: field.name, value},
            fieldInfo: field,
            onChange: applyWidgetValue
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
