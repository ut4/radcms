const EXTRA_FIELD_SEPARATOR = '__separator__';

class ContentNodeFieldList extends preact.Component {
    /**
     * @param {Object} props {
     *     fieldsInfo: {[string]: string;};
     *     fieldsData: {[string]: string;};
     * }
     */
    constructor(props) {
        super(props);
        if (typeof props.fieldsInfo != 'object')
            throw new TypeError('props.fieldsInfo must be an object');
        if (typeof props.fieldsData != 'object')
            throw new TypeError('props.fieldsData must be an object');
        this.state = {
            fields: this.makeFields(props),
            openFieldIdx: null,
            openFieldName: null,
            openFieldDataType: null,
        };
    }
    getFieldsData() {
        const out = {};
        this.state.fields.forEach(field => {
            const key = !field.isExtraField
                ? field.name
                : field.name + EXTRA_FIELD_SEPARATOR + field.dataType;
            out[key] = this.props.fieldsData[field.name];
        });
        return out;
    }
    render() {
        return $el('div', null,
            this.buildFieldEls(true), // own
            this.buildFieldEls(false), // extra
            this.state.openFieldIdx === null ? $el('div', null,
                $el('button', {type: 'button',
                               onClick: () => { this.setOpenField(); }},
                    'Add field (for devs)')
            ) : null
        );
    }
    componentWillReceiveProps(props) {
        if (Object.keys(props.fieldsInfo).join() !=
            Object.keys(this.props.fieldsInfo).join()) {
            this.setState({fields: this.makeFields(props)});
        }
    }
    makeFields(props) {
        const out = [];
        for (const key in props.fieldsData) {
            if (key.indexOf(EXTRA_FIELD_SEPARATOR) < 0) {
                const dataType = props.fieldsInfo[key];
                // Field $key has been removed from the content type -> skip completely
                if (!dataType) continue;
                out.push({name: key, dataType, isExtraField: false});
            } else {
                const [name, dataType] = key.split(EXTRA_FIELD_SEPARATOR);
                props.fieldsData[name] = props.fieldsData[key];
                const newestDataType = props.fieldsInfo[name];
                if (!newestDataType) {
                    out.push({name, dataType, isExtraField: true});
                } else { // Field $name has been "officially" added to the content type
                    out.push({name, dataType: newestDataType, isExtraField: false});
                }
            }
        }
        for (const key in props.fieldsInfo) {
            if (!out.some(f => f.name == key))
                out.push({name: key, dataType: props.fieldsInfo[key],
                          isExtraField: false});
        }
        return out;
    }
    buildFieldEls(onlyOwnFields) {
        let inputEls = [];
        this.state.fields.forEach((field, i) => {
            if (field.isExtraField === onlyOwnFields) return;
            inputEls.push(this.state.openFieldIdx !== i
                ? this.buildFieldElNormalState(field)
                : this.buildFieldElEditState(field)
            );
        });
        return $el('div', null, inputEls);
    }
    buildFieldElNormalState(field) {
        const makeInput = field => {
            let props = {
                name: field.name,
                value: this.props.fieldsData[field.name],
                onChange: e => this.receiveFieldValue(e)
            };
            if (field.dataType == 'richtext') return $el('textarea', props, null);
            return $el('input', props, null);
        };
        return $el('label', null,
            $el('span', null,
                field.name.toUpperCase()[0] + field.name.substr(1),
                ...(field.isExtraField ? [
                    $el('button', {type: 'button',
                                   onClick: () => {
                                       this.setOpenField(field);
                                   }}, 'e'),
                    $el('button', {type: 'button',
                                   onClick: () => {
                                       this.removeExtraField(field.name);
                                   }}, 'x')
                ]: [])
            ),
            makeInput(field)
        );
    }
    buildFieldElEditState() {
        return $el('div', {className: 'in-edit'},
            $el('input', {name: 'openFieldName',
                          placeholder: 'fieldname',
                          onInput: e => Form.receiveInputValue(e, this),
                          value: this.state.openFieldName,
                          className: 'inline'}, null),
            $el('label', null,
                $el('select', {name: 'openFieldDataType',
                               onChange: e => Form.receiveInputValue(e, this),
                               value: this.state.openFieldDataType},
                    dataTypes.map(type =>
                        $el('option', {value: type.name}, type.name)
                    )
                )
            ),
            $el('button', {type: 'button',
                           onClick: () => { this.confirmFieldForm(); },
                           disabled: this.state.openFieldName.length == 0}, 'Ok'),
            $el('button', {type: 'button',
                           onClick: () => { this.closeFieldForm(); }}, 'Cancel')
        );
    }
    setOpenField(field) {
        if (!field) {
            this.state.fields.push({name: '', dataType: dataTypes[0].name,
                                    isExtraField: true});
            field = this.state.fields[this.state.fields.length - 1];
        }
        this.setState({openFieldIdx: this.state.fields.indexOf(field),
                       openFieldName: field.name,
                       openFieldDataType: field.dataType});
    }
    receiveFieldValue(e) {
        this.props.fieldsData[e.target.name] = e.target.value;
    }
    confirmFieldForm() {
        const field = this.state.fields[this.state.openFieldIdx];
        field.name = this.state.openFieldName;
        field.dataType = this.state.openFieldDataType;
        this.closeFieldForm(this.state.fields);
    }
    closeFieldForm(fields) {
        const newState = {openFieldIdx: null,
                          openFieldName: null,
                          openFieldDataType: null};
        if (fields) newState.fields = fields;
        this.setState(newState);
    }
    removeExtraField(name) {
        this.setState({fields: this.state.fields.filter(f => f.name != name)});
    }
}

export default ContentNodeFieldList;
