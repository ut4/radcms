class Confirmation extends preact.Component {
    /**
     * @param {{onConfirm: () => any; onCancel: () => any; confirmButtonText?: string; cancelButtonText?: string; }} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            { this.props.children }
            <div class="form-buttons">
                <button onClick={ () => this.handleSubmit() }
                        class="nice-button primary" type="button">
                    { this.props.confirmButtonText || 'Ok' }
                </button>
                <a onClick={ e => this.handleCancel(e) } href="">
                    { this.props.cancelButtonText || 'Peruuta' }
                </a>
            </div>
        </div>;
    }
    /**
     * @access protected
     */
    handleSubmit() {
        this.props.onConfirm();
    }
    /**
     * @access private
     */
    handleCancel(e) {
        e.preventDefault();
        this.props.onCancel();
    }
}

export default Confirmation;
