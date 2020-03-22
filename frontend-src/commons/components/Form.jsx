const formInstances = {};
const FormEvent = Object.freeze({INPUT: 'input', BLUR: 'blur', SUBMIT: 'submit'});

class Form extends preact.Component {
    /**
     * @param {FormProps} props
     */
    constructor(props) {
        super(props);
        this.validators = {};
        formInstances[props.formId || 'main'] = this;
    }
    /**
     * @access public
     */
    addValidator(myInput, rules) {
        const id = ++Form.counter;
        this.validators[id] = new ValidatorRunner(myInput, rules, id);
        return this.validators[id];
    }
    /**
     * @access public
     */
    static receiveInputValue(e, dhis, name) {
        dhis.setState({[name || e.target.name || e.target.id]: e.target.value});
    }
    /**
     * @access protected
     */
    render() {
        return <form onSubmit={ e => this.handleSubmit(e) }
                     action={ this.props.action || null }
                     method={ this.props.method || null }>
            { this.props.children }
            { !this.props.omitButtons ? <div class="form-buttons">
                <button class="nice-button primary" type="submit">
                    { this.props.submitButtonText || 'Ok' }
                </button>
                <a href={ `#${this.props.returnTo || '/'}` }
                    onClick={ e => this.cancel(e) } >
                    { this.props.cancelButtonText || 'Peruuta' }
                </a>
            </div> : null }
        </form>;
    }
    /**
     * @access protected
     */
    handleSubmit(e) {
        e.preventDefault();
        if (!this.reportValidity())
            return;
        this.props.onSubmit(e);
    }
    /**
     * @access private
     */
    reportValidity() {
        for (const key in this.validators)
            if (!this.validators[key].checkValidity(FormEvent.SUBMIT))
                return false;
        return true;
    }
}
Form.counter = 0;

class InputGroup extends preact.Component {
    /**
     * @param {{label?: string; inline?: boolean; className?: string;}} props
     */
    constructor(props) {
        super(props);
        this.baseClassName = (this.props.className || '') +
                              !this.props.inline ? '' : ' inline';
        this.state = {cssClassString: this.baseClassName, labelProps: null};
    }
    /**
     * @access protected
     */
    componentDidMount() {
        const myInput = this.findComponentInstance([Input, Textarea, Select]);
        if (myInput) {
            myInput.onCssClassesChanged(classes => {
                this.setState({cssClassString: this.baseClassName +
                                               ValidatableInput.formatCssClasses(classes)});
            });
            const inputEl = myInput.getDomInputEl();
            if (inputEl)
                this.setState({labelProps: inputEl.id ? {htmlFor: inputEl.id} : null});
            if (this.props.label && !myInput.getLabel())
                myInput.setLabel(this.props.label);
            const errors = this.findComponentInstance([InputErrors]);
            if (errors)
                myInput.setErrorTarget(errors);
        }
    }
    /**
     * @access protected
     */
    render() {
        const cls = 'input-group' + this.state.cssClassString;
        if (!this.props.label)
            return <div class={ cls }>{ this.props.children }</div>;
        return <div class={ cls }>
            { preact.createElement('label', this.state.labelProps, this.props.label) }
            { this.props.children }
        </div>;
    }
    /**
     * @access private
     */
    findComponentInstance(OfComponentCls) {
        const children = Array.isArray(this.props.children) ? this.props.children : [this.props.children];
        return getPreactComponentInstance(children.find(el => el && OfComponentCls.indexOf(el.type) > -1));
    }
}
function getPreactComponentInstance(el) {
    return el ? el.__c || el._component : null;
}

class ValidatableInput extends preact.Component {
    /**
     * @param {{validations?: Array; formId?: string; [key: string]: any;}} props
     */
    constructor(props) {
        super(props);
        this.validator = null;
        this.inputEl = null;
        this.label = '';
        this.errorTarget = null;
        this.hasValidations = (props.validations || []).length > 0;
        this.state = {invalid: false, blurredAtLeastOnce: false, focused: false};
        this.cssClassesChangeListener = () => {};
        this.hookUpProps(props);
    }
    /**
     * @returns {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement}
     * @access public
     */
    getDomInputEl() {
        return this.inputEl;
    }
    /**
     * @param {string} label
     * @access public
     */
    setLabel(label) {
        this.label = label;
    }
    /**
     * @returns {string}
     * @access public
     */
    getLabel() {
        return this.label;
    }
    /**
     * @param {preact.VNode} errorComponent
     * @access public
     */
    setErrorTarget(errorComponent) {
        this.errorTarget = errorComponent;
    }
    /**
     * @returns {preact.VNode}
     * @access public
     */
    getErrorTarget() {
        return this.errorTarget;
    }
    /**
     * @param {(classes: Object) => any} fn
     * @access public
     */
    onCssClassesChanged(fn) {
        this.cssClassesChangeListener = fn;
    }
    /**
     * @access public
     */
    receiveValidity(isValid, event) {
        const newState = {invalid: !isValid};
        if (event === FormEvent.BLUR || event === FormEvent.SUBMIT) {
            newState.blurredAtLeastOnce = true;
            if (event === FormEvent.BLUR)
                newState.focused = false;
        }
        this.emitCssClassesChange(newState);
    }
    /**
     * @param {{invalid: boolean; focused: boolean; blurredAtLeastOnce: boolean;}}
     * @returns {string}
     */
    static formatCssClasses(classes) {
        return (classes.invalid ? ' invalid' : '') +
               (classes.focused ? ' focused' : '') +
               (classes.blurredAtLeastOnce ? ' blurred-at-least-once' : '');
    }
    /**
     * @returns {string} 'input'|'select' etc.
     * @access protected
     */
    getTagName() {
        throw new Error('Abstract method not implemented');
    }
    /**
     * @access protected
     */
    componentDidMount() {
        if (this.hasValidations && !this.validator) {
            const instance = formInstances[this.props.formId || 'main'];
            if (instance)
                this.validator = instance.addValidator(this, this.props.validations);
            else
                throw new Error(`<@rad-commons.Form/> "${this.props.formId || 'main'}" not found.`);
        }
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (this.props.onInput) this.hookUpProps(props);
    }
    /**
     * @access protected
     */
    render() {
        const props = Object.assign({}, this.props);
        props.className = (props.className || '') +
                          ValidatableInput.formatCssClasses(this.state);
        return preact.createElement(this.getTagName(),
                                    Object.assign({}, props, {ref: el => {
                                        if (el) this.inputEl = el;
                                    }}));
    }
    /**
     * @access private
     */
    hookUpProps(props) {
        const origOnFocus = props.onFocus;
        props.onFocus = e => {
            this.emitCssClassesChange({focused: true});
            if (origOnFocus) origOnFocus(e);
        };
        if (this.hasValidations) {
            const origOnInput = props.onInput;
            props.onInput = e => {
                this.validator.checkValidity(FormEvent.INPUT);
                if (origOnInput) origOnInput(e);
            };
        }
        const origOnBlur = props.onBlur;
        props.onBlur = e => {
            if (!this.hasValidations)
                this.emitCssClassesChange({focused: false,
                                           blurredAtLeastOnce: true});
            else
                this.validator.checkValidity(FormEvent.BLUR);
            if (origOnBlur) origOnBlur(e);
        };
        return props;
    }
    /**
     * @access private
     */
    emitCssClassesChange(newState) {
        this.setState(newState);
        this.cssClassesChangeListener(Object.assign(this.state, newState));
    }
}

class Input extends ValidatableInput {
    getTagName() { return 'input'; }
}

class Textarea extends ValidatableInput {
    getTagName() { return 'textarea'; }
}

class Select extends ValidatableInput {
    getTagName() { return 'select'; }
}

class InputErrors extends preact.Component {
    /**
     * @param {string} errorMessage
     * @access public
     */
    setError(errorMessage) {
        this.setState({errorMessage});
    }
    /**
     * @access protected
     */
    render() {
        return !this.state.errorMessage
            ? null
            : <p class="error">{ this.state.errorMessage }</p>;
    }
}

const validatorImplFactories = {
    'required':
        [(value) => !!value, '{field} vaaditaan']
    ,
    'minLength':
        [(value, min) => value.length >= min, '{field} tulee ole vähintään {arg0} merkkiä pitkä']
    ,
    'min':
        [(value, min) => value >= min, '{field} tulee olla vähintään {arg0}']
    ,
};
function expandRules(rules) {
    return rules.map(([ruleName, ...args]) => {
        const ruleImpl = validatorImplFactories[ruleName];
        if (!ruleImpl)
            throw new Error(`Rule ${ruleName} not implemented`);
        return {ruleImpl, args};
    });
}
class ValidatorRunner {
    /**
     * @param {ValidatableInput} myInput
     * @param {Array<[string, ...any]>} ruleSettings
     */
    constructor(myInput, ruleSettings) {
        this.myInput = myInput;
        this.ruleImpls = expandRules(ruleSettings);
    }
    /**
     * @param {keyof {blur: 1; input: 1; submit: 1;}} event = 'none'
     * @access public
     */
    checkValidity(event = 'none') {
        const value = this.myInput.getDomInputEl().value;
        const errorTarget = this.myInput.getErrorTarget();
        let isValid = true;
        for (const {ruleImpl, args} of this.ruleImpls) {
            const [validationFn, errorTmpl] = ruleImpl;
            isValid = validationFn(value, ...args);
            if (errorTarget)
                errorTarget.setError(isValid ? '' : this.formatError(errorTmpl, args));
            if (!isValid)
                break;
        }
        this.myInput.receiveValidity(isValid, event);
        return isValid;
    }
    /**
     * @access private
     */
    formatError(errorTmpl, args) {
        let out = errorTmpl.replace('{field}', this.myInput.getLabel());
        args.forEach((arg, i) => {
            out = out.replace(`arg${i}`, arg);
        });
        return out;
    }
}

export default Form;
export {InputGroup, InputErrors, Input, Textarea, Select};
