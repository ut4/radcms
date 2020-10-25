class BaseFieldWidget extends preact.Component {
    /**
     * @param {{field: ContentTypeField|MultiFieldField; initialValue: string; onValueChange: (newValue: any) => any; settings?: Object; labelHint?: string;}} props
     */
    constructor(props) {
        super(props);
        if (!props.field || !props.field.name)
            throw new Error('props.field is required');
        if (typeof props.onValueChange !== 'function')
            throw new Error('props.onValueChange is required');
        this.label = [props.field.friendlyName || props.field.name,
                      !props.labelHint ? null : <span class="note">{ props.labelHint }</span>];
    }
    /**
     * @returns {string}
     * @access public
     */
    static getInitialValue() {
        throw new Error('Abstract method not implemented.');
    }
    /**
     * @param {FieldWidget & {group: string;}} previous
     * @param {FieldWidget} newWidget
     * @param {string} value
     * @returns {string=}
     * @access public
     */
    static convert(previous, newWidget, value) {
        throw new Error('Abstract method not implemented.');
    }
    /**
     * @access protected
     */
    render() {
        throw new Error('Abstract method not implemented.');
    }
}

export default BaseFieldWidget;
