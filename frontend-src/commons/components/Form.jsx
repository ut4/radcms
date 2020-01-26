import {urlUtils} from '../utils.js';

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

/**
 * @param {{label?: string|Function; inline?: boolean; className?: string; id?: string;}} props
 */
function InputGroup(props) {
    const children = Array.isArray(props.children) ? props.children : [props.children];
    const label = props.label;
    return <div class={ (!props.inline ? 'input-group' : 'input-group-inline') +
                        (!props.className ? '' : ` ${props.className}`) }>
        { children.concat(
            label !== undefined && label !== null
                ? preact.createElement('label', makeLabelAttrs(children, props),
                    typeof label === 'string' ? label : preact.createElement(label)
                )
                : null
        ) }
    </div>;
}

function makeLabelAttrs(children, props) {
    const input = children.find(el => el.type === 'input' ||
                                      el.type === 'textarea' ||
                                      el.type === 'select');
    const id = props.id || (input && input.props.id);
    return id ? {htmlFor: id} : null;
}

/**
 * @param {{patternError?: string; maxError?: string; minError?: string; stepError?: string; maxLengthError?: string; minLengthError?: string; typeError?: string; requiredError?: string; [key: string]: any;}} props
 */
function Input(props) {
    return makeInput(props, 'input');
}

/**
 * @param {{patternError?: string; maxError?: string; minError?: string; stepError?: string; maxLengthError?: string; minLengthError?: string; typeError?: string; requiredError?: string; [key: string]: any;}} props
 */
function Select(props) {
    return makeInput(props, 'select');
}

/**
 * @param {{patternError?: string; maxError?: string; minError?: string; stepError?: string; maxLengthError?: string; minLengthError?: string; typeError?: string; requiredError?: string; [key: string]: any;}} props
 */
function Textarea(props) {
    return makeInput(props, 'textarea');
}

function makeInput(props, tag) {
    if (props.pattern || props.min || props.max || props.required ||
        props.step || props.minLength || props.maxLength) {
        const origOnInvalid = props.onInvalid;
        props.onInvalid = e => {
            const v = e.target.validity;
            if (!v.valid) {
                let message = [];
                if (v.patternMismatch && props.patternError) message.push(props.patternError);
                if (v.rangeOverflow && props.maxError) message.push(props.maxError);
                if (v.rangeUnderflow && props.minError) message.push(props.minError);
                if (v.stepMismatch && props.stepError) message.push(props.stepError);
                if (v.tooLong && props.maxLengthError) message.push(props.maxLengthError);
                if (v.tooShort && props.minLengthError) message.push(props.minLengthError);
                if (v.typeMismatch && props.typeError) message.push(props.typeError);
                if (v.valueMissing && props.requiredError) message.push(props.requiredError);
                //
                if (message.length)
                    e.target.setCustomValidity(message.join('\n'));
            }
            if (origOnInvalid) origOnInvalid(e);
        };
        const origOnInput = props.onInput;
        props.onInput = e => {
            e.target.checkValidity();
            if (origOnInput) origOnInput(e);
        };
    }
    return preact.createElement(tag, props, props.children);
}

export default Form;
export {InputGroup, Input, Select, Textarea};
