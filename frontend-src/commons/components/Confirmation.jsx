import {FormButtons} from './Form.jsx';

class Confirmation extends preact.Component {
    /**
     * @param {{onConfirm: () => any; onCancel: () => any; confirmButtonText?: string; cancelButtonText?: string; }} props
     * @access protected
     */
    render({children, onConfirm, confirmButtonText, cancelButtonText}) {
        return <div>
            { children }
            <div class="form-buttons">
                <button onClick={ () => onConfirm() }
                        class="btn btn-primary mr-2" type="button">
                    { confirmButtonText || 'Ok' }
                </button>
                <a onClick={ e => this.handleCancel(e) } href="">
                    { cancelButtonText || 'Peruuta' }
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
     * @access protected
     */
    render({onConfirm, children, confirmButtonText, cancelButtonText}) {
        return <form onSubmit={ e => onConfirm(e) }>
            { children }
            <FormButtons
                onCancel={ e => this.handleCancel(e) }
                submitButtonText={ confirmButtonText }
                cancelButtonText={ cancelButtonText }/>
        </form>;
    }
}

export default Confirmation;
export {FormConfirmation};
