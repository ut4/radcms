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
    return rules.map(([ruleNameOrCustomImpl, ...args]) => {
        // ['ruleName', ...args]
        if (typeof ruleNameOrCustomImpl === 'string') {
            const ruleImpl = validatorImplFactories[ruleNameOrCustomImpl];
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
            if (error) overall = false;
            if (!overall && error && !classes[inputName].blurredAtLeastOnce)
                classes[inputName].blurredAtLeastOnce = true;
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
        props.vm.form.validatorRunner.setValidatorForInput(props.name,
            new Validator(this, props.validations || []));
        this.inputEl = null;
    }
    /**
     * @returns {string}
     * @access public
     */
    getValue() {
        return this.inputEl.value;
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
        return preact.createElement(tagName, Object.assign({}, this.props, {
            name,
            value: state.values[name],
            [!(tagName === 'select' ||
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
    return (classes.invalid ? ' invalid' : '') +
            (classes.focused ? ' focused' : '') +
            (classes.blurredAtLeastOnce ? ' blurred-at-least-once' : '');
}

class InputGroup extends preact.Component {
    /**
     * @param {{classes?: {invalid: boolean; focused: boolean; blurredAtLeastOnce: boolean;}; className?: string; inline?: boolean;}} props
     */
    constructor(props) {
        super(props);
        this.staticCssClassString = 'input-group' +
                                    (this.props.className || '') +
                                    (!this.props.inline ? '' : ' inline');
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
        return !error ? null : <p class="error">{ error }</p>;
    }
}

class FormButtons extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div class="form-buttons">
            { (this.props.buttons || ['submit', 'cancel']).map(candidate => {
                if (candidate === 'submit')
                    return <button class="nice-button primary" type="submit">
                        { this.props.submitButtonText || 'Ok' }
                    </button>;
                if (candidate === 'cancel')
                    return <a href={ `#${this.props.returnTo || '/'}` }>
                        { this.props.cancelButtonText || 'Peruuta' }
                    </a>;
                return candidate;
            }) }
        </div>;
    }
}

export default hookForm;
export {InputGroup, Input, Textarea, Select, InputError, FormButtons, Validator};
