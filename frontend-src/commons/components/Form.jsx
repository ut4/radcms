import {urlUtils} from '../utils.js';

/**
 * @param {{label: string|function?; id?: string; className?: string; inline?: boolean;}} props
 */
class Form extends preact.Component {
    /**
     * @param {FormProps} props
     */
    constructor(props) {
        super(props);
        if (!props.onConfirm) throw new TypeError('props.onConfirm() is required.');
    }
    /**
     * @access protected
     */
    render() {
        return <form onSubmit={ e => this.handleSubmit(e) }>
            { this.props.children }
            <div class="form-buttons">
                <button class="nice-button primary"
                        disabled={ this.doDisableConfirmButton() }
                        type="submit">
                    { this.props.confirmButtonText || 'Ok' }
                </button>
                <a href="#/">{ this.props.cancelButtonText || 'Cancel' }</a>
            </div>
        </form>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        e.preventDefault();
        const res = this.props.onConfirm(e);
        if (res && res instanceof Promise && this.props.autoClose !== false) {
            res.then(() => this.close());
            return;
        }
        if (this.props.autoClose !== false) {
            this.close();
        }
    }
    /**
     * @access public
     */
    static receiveInputValue(e, dhis, name) {
        dhis.setState({[name || e.target.name]: e.target.value});
    }
    /**
     * @access private
     */
    cancel(e) {
        if (this.props.onCancel) this.props.onCancel(e);
        this.close();
    }
    /**
     * @access private
     */
    doDisableConfirmButton() {
        return typeof this.props.doDisableConfirmButton === 'function'
            ? this.props.doDisableConfirmButton()
            : false;
    }
    /**
     * @access protected
     */
    close() {
        if (this.props.close) {
            this.props.close();
            return;
        }
        urlUtils.redirect('/');
    }
}

export default Form;
