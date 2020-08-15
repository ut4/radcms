import FeatherSvg from './FeatherSvg.jsx';

const validationStrings = {
    required: '{field} vaaditaan',
    minLength: '{field} tulee ole vähintään {arg0} merkkiä pitkä',
    min: '{field} tulee olla vähintään {arg0}',
};
const validatorImplFactories = {
    'required': messages =>
        [(value) => !!value, messages.required]
    ,
    'minLength': messages =>
        [(value, min) => value.length >= min, messages.minLength]
    ,
    'min': messages =>
        [(value, min) => value >= min, messages.min]
    ,
    'regexp': () =>
        [(value, pattern) => (new RegExp(pattern)).test(value), '{field}']
    ,
};
function expandRules(rules) {
    return rules.map(([ruleNameOrCustomImpl, ...args]) => {
        // ['ruleName', ...args]
        if (typeof ruleNameOrCustomImpl === 'string') {
            const ruleImpl = validatorImplFactories[ruleNameOrCustomImpl](validationStrings);
            if (!ruleImpl)
                throw new Error(`Rule ${ruleNameOrCustomImpl} not implemented`);
            return {ruleImpl, args};
        }
        // [[<customFn>, <errorTmpl>], ...args]
        if (typeof ruleNameOrCustomImpl[0] !== 'function' ||
            typeof ruleNameOrCustomImpl[1] !== 'string')
            throw new Error('One-time-rule must be [myCheckFn, \'Error template\']');
        return {ruleImpl: ruleNameOrCustomImpl, args};
    });
}
class Validator {
    /**
     * @param {{getValue: () => string; getLabel: () => string;}} myInput
     * @param {Array<[string, ...any]>} ruleSettings
     */
    constructor(myInput, ruleSettings) {
        this.myInput = myInput;
        this.ruleImpls = expandRules(ruleSettings);
    }
    /**
     * @returns {string|null}
     * @access public
     */
    checkValidity() {
        const value = this.myInput.getValue();
        for (const {ruleImpl, args} of this.ruleImpls) {
            const [validationFn, errorTmpl] = ruleImpl;
            if (!validationFn(value, ...args))
                return this.formatError(errorTmpl, args);
        }
        return null;
    }
    /**
     * @access private
     */
    formatError(errorTmpl, args) {
        return args.reduce((error, arg, i) =>
            error.replace(`{arg${i}}`, arg)
        , errorTmpl.replace('{field}', this.myInput.getLabel()));
    }
    /**
     * @param {{[key: string]: string;}} strings
     * @access public
     */
    static setValidationStrings(strings) {
        Object.assign(validationStrings, strings);
    }
}
class ValidatorRunner {
    /**
     * @param {{[key: string]: Validator}=} initialValidators
     */
    constructor(initialValidators) {
        this.validators = {};
        if (initialValidators) {
            for (const name in initialValidators)
                this.setValidatorForInput(name, initialValidators[name]);
        }
    }
    /**
     * @param {string} inputName
     * @param {Validator} validator
     * @access public
     */
    setValidatorForInput(inputName, validator) {
        if (inputName === '__proto__' || inputName === 'constructor')
            throw new Error(`Invalid inputName ${inputName}`);
        this.validators[inputName] = validator;
    }
    /**
     * @param {string} inputName
     * @returns {boolean}
     * @access public
     */
    hasValidatorForInput(inputName) {
        return !!this.validators[inputName];
    }
    /**
     * @param {string} inputName
     * @returns {string|null}
     * @access public
     */
    validateInput(inputName) {
        return this.validators[inputName].checkValidity();
    }
    /**
     * @param {(validator: Validator, inputName: string) => false|any} fn
     */
    each(fn) {
        for (const inputName in this.validators) {
            if (fn(this.validators[inputName], inputName) === false)
                return false;
        }
        return true;
    }
}
class Form {
    /**
     * @param {preact.Component} vm
     * @param {ValidatorRunner} validatorRunner
     */
    constructor(vm, validatorRunner) {
        this.vm = vm;
        this.validatorRunner = validatorRunner;
        this.isSubmitting = false;
    }
    /**
     * @param {InputEvent} e
     * @access public
     */
    handleChange(e, myAlterStateFn = null) {
        const name = e.target.name;
        const {values, errors, classes} = this.vm.state;
        values[name] = e.target.type !== 'checkbox' ? e.target.value : e.target.checked;
        errors[name] = this.validatorRunner.hasValidatorForInput(name)
            ? this.validatorRunner.validateInput(name)
            : '';
        classes[name].invalid = !!errors[name];
        classes[name].focused = true;
        this.applyState({values, errors, classes}, myAlterStateFn);
    }
    /**
     * @param {string} value
     * @param {string} inputName
     * @param {string} inputType 'text'|'checkbox' etc.
     * @access public
     */
    triggerChange(value, inputName, inputType = 'text') {
        this.handleChange({target: {
            name: inputName,
            type: inputType,
            value,
            checked: value,
        }});
    }
    /**
     * @param {InputEvent} e
     * @param {(state: Object) => Object} myAlterStateFn = null
     * @access public
     */
    handleFocus(e, myAlterStateFn = null) {
        const classes = this.vm.state.classes;
        classes[e.target.name].focused = true;
        this.applyState({classes}, myAlterStateFn);
    }
    /**
     * @param {InputEvent} e
     * @param {(state: Object) => Object} myAlterStateFn = null
     * @access public
     */
    handleBlur(e, myAlterStateFn = null) {
        if (this.isSubmitting) return;
        const name = e.target.name;
        const {errors, classes} = this.vm.state;
        errors[name] = this.validatorRunner.hasValidatorForInput(name)
            ? this.validatorRunner.validateInput(name)
            : '';
        classes[name].invalid = !!errors[name];
        classes[name].blurredAtLeastOnce = true;
        classes[name].focused = false;
        this.applyState({errors, classes}, myAlterStateFn);
    }
    /**
     * @param {InputEvent} e
     * @param {(state: Object) => Object} myAlterStateFn = null
     * @access public
     */
    triggerBlur(inputName, myAlterStateFn = null) {
        this.handleBlur({target: {
            name: inputName,
        }}, myAlterStateFn);
    }
    /**
     * @param {InputEvent=} e
     * @param {(state: Object) => Object} myAlterStateFn = null
     * @returns {bool|null} true = valid, false = invalid, null = alreadySubmitting
     * @access public
     */
    handleSubmit(e, myAlterStateFn = null) {
        if (e) e.preventDefault();
        if (this.isSubmitting) return null;
        this.setIsSubmitting();
        const {errors, classes} = this.vm.state;
        let overall = true;
        this.validatorRunner.each((validator, inputName) => {
            const error = validator.checkValidity();
            errors[inputName] = error;
            classes[inputName].invalid = !!error;
            if (overall && error && !classes[inputName].blurredAtLeastOnce)
                classes[inputName].blurredAtLeastOnce = true;
            if (error) overall = false;
        });
        this.applyState({errors, classes}, myAlterStateFn);
        return overall;
    }
    /**
     * @access private
     */
    applyState(newState, alterFn) {
        this.vm.setState(!alterFn ? newState : alterFn(newState));
    }
    /**
     * @access private
     */
    setIsSubmitting() {
        this.isSubmitting = true;
        setTimeout(() => {
            this.isSubmitting = false;
        }, 800);
    }
}

const hookForm = (vm, values, validators = null) => {
    const state = {
        values,
        errors: Object.keys(values).reduce((obj, key) =>
            Object.assign(obj, {[key]: null})
        , {}),
        classes: Object.keys(values).reduce((obj, key) =>
            Object.assign(obj, {[key]: {invalid: false,
                                        blurredAtLeastOnce: false,
                                        focused: false}})
        , {}),
    };
    Object.assign(vm, {form: new Form(vm, new ValidatorRunner(validators))});
    return state;
};

class AbstractInput extends preact.Component {
    /**
     * @param {{vm: preact.Component; myOnChange?: (state: Object) => Object; validations?: Array<[string, ...any]>; errorLabel?: string; [key: string]: any;}} props
     */
    constructor(props) {
        super(props);
        if (props.type === 'radio')
            throw new Error('type="radio" not supported');
        props.vm.form.validatorRunner.setValidatorForInput(props.name,
            new Validator(this, props.validations || []));
        this.inputEl = null;
    }
    /**
     * @returns {string}
     * @access public
     */
    getValue() {
        return this.props.vm.state.values[this.props.name];
    }
    /**
     * @returns {string}
     * @access public
     */
    getLabel() {
        return (this.props.errorLabel || this.props.name) || '<name>';
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
    render() {
        const {state, form} = this.props.vm;
        const name = this.props.name;
        const tagName = this.getTagName();
        const inputType = this.props.type || 'text';
        const isSelect = tagName === 'select';
        return preact.createElement(tagName, Object.assign({}, this.props, {
            name,
            className: 'form-input ' +
                        (!this.props.className ? '' : ` ${this.props.className}`) +
                        (!isSelect ? '' : ' form-select'),
            value: state.values[name],
            [!(isSelect ||
               inputType === 'checkbox' ||
               inputType === 'radio') ? 'onInput' : 'onChange']:
                e => form.handleChange(e, this.props.myOnChange),
            onFocus: e => form.handleFocus(e, this.props.onFocus),
            onBlur: e => form.handleBlur(e, this.props.onBlur),
            ref: el => { this.inputEl = el; },
        }));
    }
}

class Input extends AbstractInput {
    getTagName() { return 'input'; }
}

class Textarea extends AbstractInput {
    getTagName() { return 'textarea'; }
}

class Select extends AbstractInput {
    getTagName() { return 'select'; }
}

/**
 * @param {{invalid: boolean; focused: boolean; blurredAtLeastOnce: boolean;}}
 * @returns {string}
 */
function formatCssClasses(classes) {
    return (classes.invalid ? ' has-error' : '') +
            (classes.focused ? ' focused' : '') +
            (classes.blurredAtLeastOnce ? ' blurred-at-least-once' : '');
}

class InputGroup extends preact.Component {
    /**
     * @param {{classes?: {invalid: boolean; focused: boolean; blurredAtLeastOnce: boolean;}; className?: string;}} props
     */
    constructor(props) {
        super(props);
        this.staticCssClassString = 'form-group' +
                                    (this.props.className || '');
    }
    /**
     * @access protected
     */
    render() {
        const className = this.staticCssClassString + (this.props.classes
            ? formatCssClasses(this.props.classes)
            : '');
        return preact.createElement('div', {className}, this.props.children);
    }
}

class InputError extends preact.Component {
    /**
     * @param {{error?: string;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        const error = this.props.error;
        return !error ? null : <p class="form-input-hint">{ error }</p>;
    }
}

class FormButtons extends preact.Component {
    /**
     * @param {{buttons?: Array<'submit'|'submitWithAlt'|'cancel'|preact.AnyComponent>; submitButtonText?: string; altSubmitButtonText?: string; cancelButtonText?: string; returnTo?: string; className?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {altMenuIsOpen: false};
    }
    /**
     * @access protected
     */
    render(props) {
        return <div class={ `form-buttons${!props.className ? '' : ` ${props.className}`}` }>
            { (props.buttons || ['submit', 'cancel']).map(candidate => {
                if (candidate === 'submit')
                    return <button class="btn btn-primary" type="submit">
                        { props.submitButtonText || 'Ok' }
                    </button>;
                if (candidate === 'submitWithAlt')
                    return <div class={ `btn-group p-relative${!this.state.altMenuIsOpen ? '' : ' open'}` }>
                        <button class="btn btn-primary" type="submit">
                            { props.submitButtonText || 'Ok' }
                        </button>
                        <button
                            onClick={ () => this.setState({altMenuIsOpen: !this.state.altMenuIsOpen}) }
                            class="btn btn-primary"
                            type="button">
                            <FeatherSvg iconId="chevron-down" className=" feather-xs"/>
                        </button>
                        <a href="#close" onClick={ e => this.closeAltMenu(e) } class="close-overlay"></a>
                        <ul class="popup-menu menu">
                            <li class="menu-item"><a onClick={ e => this.triggerOnSubmit(e) } href="">{ props.altSubmitButtonText || 'Alt' }</a></li>
                        </ul>
                    </div>;
                if (candidate === 'cancel')
                    return <a
                        href={ `#${props.returnTo || '/'}` }
                        onClick={ e => this.handleCancel(e) }
                        class="ml-2">
                        { props.cancelButtonText || 'Peruuta' }
                    </a>;
                return candidate;
            }) }
        </div>;
    }
    /**
     * @access protected
     */
    handleCancel(e) {
        if (this.props.onCancel) this.props.onCancel(e);
    }
    /**
     * @access private
     */
    triggerOnSubmit(e) {
        this.closeAltMenu(e);
        const form = e.target.closest('form');
        if (!form) throw new Error('Expected <FormButtons/> to be a child of <form>');
        const myEvent = new Event('submit', {'bubbles': true, 'cancelable': true});
        myEvent.altSubmitLinkIndex = 0;
        form.dispatchEvent(myEvent);
    }
    /**
     * @access private
     */
    closeAltMenu(e) {
        e.preventDefault();
        this.setState({altMenuIsOpen: false});
    }
}

export {hookForm, InputGroup, Input, Textarea, Select, InputError, FormButtons, Validator as FormInputValidator};
