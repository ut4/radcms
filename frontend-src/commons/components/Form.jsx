import FeatherSvg from './FeatherSvg.jsx';

const validationStrings = {
    required: '{field} vaaditaan',
    minLength: '{field} tulee ole vähintään {arg0} merkkiä pitkä',
    maxLength: '{field} tulee ole enintään {arg0} merkkiä pitkä',
    min: '{field} tulee olla vähintään {arg0}',
    max: '{field} tulee olla enintään {arg0}',
};

const validatorImplFactories = {
    'required': messages =>
        [(value) => !!value, messages.required]
    ,
    'type': () => {
        throw new Error('Not implemented yet.');
    },
    'minLength': messages =>
        [(value, min) => value.length >= min, messages.minLength]
    ,
    'maxLength': messages =>
        [(value, max) => value.length <= max, messages.maxLength]
    ,
    'min': messages =>
        [(value, min) => value >= min, messages.min]
    ,
    'max': messages =>
        [(value, max) => value <= max, messages.max]
    ,
    'in': () => {
        throw new Error('Not implemented yet.');
    },
    'identifier': () => {
        throw new Error('Not implemented yet.');
    },
    'regexp': (_, args) =>
        [(value, pattern) => (new RegExp(pattern)).test(value),
         `{field}${args.length < 2 ? ' ei kelpaa' : '{arg1}'}`]
    ,
};
function expandRules(rules) {
    return rules.map(([ruleNameOrCustomImpl, ...args]) => {
        // ['ruleName', ...args]
        if (typeof ruleNameOrCustomImpl === 'string') {
            const ruleImpl = validatorImplFactories[ruleNameOrCustomImpl](validationStrings, args);
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
     * @param {string} errorLabel
     * @param {Array<[string, ...any]|[[function, string], ...any]>} ruleSettings
     */
    constructor(errorLabel, ruleSettings) {
        this.errorLabel = errorLabel;
        this.ruleImpls = expandRules(ruleSettings);
    }
    /**
     * @param {any} value
     * @returns {string|null}
     * @access public
     */
    checkValidity(value) {
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
        , errorTmpl.replace('{field}', this.errorLabel));
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
     * @param {Object} inputs = {}
     */
    constructor(inputs = {}) {
        this.validators = {};
        for (const name in inputs) {
            const {validations} = inputs[name];
            if (!validations)
                continue;
            if (!Array.isArray(validations) ||
                !Array.isArray(validations[0]))
                throw new TypeError('validations must be an array of arrays');
            this.setValidatorForInput(name,
                new Validator(inputs[name].label || name, validations));
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
     * @param {any} value
     * @returns {string|null}
     * @access public
     */
    validateInput(inputName, value) {
        return this.validators[inputName].checkValidity(value);
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
            ? this.validatorRunner.validateInput(name, values[name])
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
            ? this.validatorRunner.validateInput(name, this.vm.state.values[name])
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
        const {values, errors, classes} = this.vm.state;
        let overall = true;
        this.validatorRunner.each((validator, inputName) => {
            const error = validator.checkValidity(values[inputName]);
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

const hookForm = (vm, values = null, inputs = null) => {
    if (!values) values = Object.keys(inputs).reduce((out, key) => {
        out[key] = inputs[key].value;
        return out;
    }, {});
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
    Object.assign(vm, {form: new Form(vm, new ValidatorRunner(inputs))});
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
            new Validator((props.errorLabel || props.name) || '<name>',
                          props.validations || []));
        this.inputEl = null;
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
     * @access protected
     */
    render({children, classes, className}) {
        return <div
            className={ 'form-group' +
                        (!className ? '' : ` ${className}`) +
                        (classes ? formatCssClasses(classes) : '') }>
            { children }
        </div>;
    }
}

class InputError extends preact.Component {
    /**
     * @param {{error?: string; className?: string;}} props
     * @access protected
     */
    render({error, className}) {
        return !error ? null : <p class={ 'form-input-hint' + (!className ? '' : ` ${className}`) }>{ error }</p>;
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
                            <FeatherSvg iconId="chevron-down" className="feather-xs"/>
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

export {hookForm, InputGroup, Input, Textarea, Select, InputError, FormButtons};
