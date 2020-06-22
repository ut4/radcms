import {FormButtons} from './Form.jsx';

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
                <button onClick={ () => this.props.onConfirm() }
                        class="btn btn-primary mr-2" type="button">
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
    handleCancel(e) {
        e.preventDefault();
        this.props.onCancel();
    }
}

class FormConfirmation extends Confirmation {
    /**
     * @param {{onConfirm: (e: UIEvent) => any; onCancel: () => any; confirmButtonText?: string; cancelButtonText?: string; }} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <form onSubmit={ e => this.props.onConfirm(e) }>
            { this.props.children }
            <FormButtons
                onCancel={ e => this.handleCancel(e) }
                submitButtonText={ this.props.confirmButtonText }
                cancelButtonText={ this.props.cancelButtonText }/>
        </form>;
    }
}

export default Confirmation;
export {FormConfirmation};
