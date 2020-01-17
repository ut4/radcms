/**
 * @param {Object} content
 */
function InputGroup(props) {
    const id = props.id || (props.children && props.children.props && props.children.props.id);
    const label = props.label !== undefined && props.label !== null ? props.label : '';
    return <div class={ (!props.inline ? 'input-group' : 'input-group-inline') +
                        (!props.className ? '' : ` ${props.className}`) }>
        { (Array.isArray(props.children) ? props.children : [props.children]).concat(
            preact.createElement('label', id ? {for: id} :null,
                typeof label === 'string' ? label : preact.createElement(label)
            )
        )}
    </div>;
}

export default InputGroup;
