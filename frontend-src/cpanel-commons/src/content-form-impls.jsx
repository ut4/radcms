import {InputGroup, InputError, hookForm} from '@rad-commons';
import FieldsFilter from './FieldsFilter.js';

class ValidatingFormImpl extends preact.Component {
    /**
     * @param {{fields: Array<ContentTypeField|MultiFieldMeta>; values: Array<any>; getWidgetImpl: (name: string) => {ImplClass: Object; props: ?Object;}|null; settings: Object; fieldHints: Array<string|null>; setFormClasses?: (classes: string) => any; onValueChange?: (value: any, field: ContentTypeField|MultiFieldMeta) => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = this.makeFormSettings(props);
        this.onValueChange = props.onValueChange || function () {};
    }
    /**
     * @returns {Object|false|null} false = invalid, null = alreadySubmitting, object = ok
     * @access public
     */
    submit(e) {
        const status = this.form.handleSubmit(e);
        if (!status)
            return status;
        return this.state.values;
    }
    /**
     * @access protected
     */
    render({fields, values, getWidgetImpl, settings, fieldHints, setFormClasses}) {
        return <div>{ fields.map((f, i) => {
            // TextFieldFieldWidget, TextAreaFieldWidget etc...
            const {ImplClass, props} = getWidgetImpl(f.widget.name);
            const validationRule = f.validationRules || null;
            const hint = fieldHints[i] || null;
            return <InputGroup classes={ validationRule ? this.state.classes[f.name] : null }
                className={ `form-input-${f.widget.name}` }>
                <label htmlFor={ f.name } class="form-label">
                    { f.friendlyName || f.name }
                    { !hint ? null : <span class="note">{ hint }</span> }
                </label>
                <ImplClass
                    field={ f }
                    initialValue={ values[f.name] }
                    onValueChange={ value => {
                        this.form.triggerChange(value, f.name);
                        this.onValueChange(value, f);
                    }}
                    settings={ Object.assign({},
                        settings[`${f.widget.name}Props`] || {},
                        props
                    ) }
                    labelHint={ hint }
                    setFormClasses={ setFormClasses }
                    key={ (f.id || f.name) }/>
                { validationRule
                    ? <InputError error={ this.state.errors[f.name] }/>
                    : null }
            </InputGroup>;
        }) }</div>;
    }
    /**
     * @access private
     */
    makeFormSettings(props) {
        return hookForm(this, null, props.fields.reduce((obj, f) => {
            obj[f.name] = {
                value: props.values[f.name],
                validations: f.validationRules,
                label: f.friendlyName,
            };
            return obj;
        }, {}));
    }
}

export {ValidatingFormImpl, FieldsFilter};
