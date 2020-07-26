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
        this.fixedInitialValue = props.initialValue;
        if (this.fixedInitialValue === '') {
            this.fixedInitialValue = this.getInitialValue();
            props.onValueChange(this.fixedInitialValue);
        }
    }
    /**
     * @returns {string}
     * @access protected
     */
    getInitialValue() {
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
