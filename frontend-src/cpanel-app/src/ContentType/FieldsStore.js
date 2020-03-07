const {createStore} = window.Redux;
let counter = 0;

class FieldsStore {
    /**
     * @param {Object} initialFields
     * @param {keyof {create: 1, edit: 1, none: 1}} initialEditMode = 'none'
     */
    constructor(initialFields, initialEditMode = 'none') {
        this.fieldsStore = createStore((state, action) => {
            if (action.type === 'ADD_FIELD')
                return state.concat(FieldsStore.makeField());
            if (action.type === 'REMOVE_FIELD')
                return state.filter(field => field.name !== action.field.name);
            if (action.type === 'SET_PROPS')
                return state.map(field => field.name === action.field.name
                    ? Object.assign({}, field, action.props)
                    : field);
            return state;
        }, initialFields.map(f => {
            f.key = ++counter;
            return f;
        }));
        if (!initialFields)
            this.addField();
        this.editModeStore = createStore((state, action) =>
            action.type === 'SET_EDIT_MODE'
                ? action.mode
            : state
        , initialEditMode);
    }
    /**
     * @returns {Array<ContentTypeField>}
     * @access public
     */
    getFields() {
        return this.fieldsStore.getState();
    }
    /**
     * @param {ContentTypeField} field
     * @param {Object} props
     * @access public
     */
    setFieldProps(field, props) {
        this.fieldsStore.dispatch({type: 'SET_PROPS', props, field});
    }
    /**
     * @access public
     */
    addField() {
        this.fieldsStore.dispatch({type: 'ADD_FIELD'});
    }
    /**
     * @param {ContentTypeField} field
     * @access public
     */
    removeField(field) {
        this.fieldsStore.dispatch({type: 'REMOVE_FIELD', field});
    }
    /**
     * @returns {keyof {create: 1, edit: 1, none: 1}}
     * @access public
     */
    getEditMode() {
        return this.editModeStore.getState();
    }
    /**
     * @param {keyof {create: 1, edit: 1, none: 1}} mode
     * @access public
     */
    setEditMode(mode) {
        this.editModeStore.dispatch({type: 'SET_EDIT_MODE', mode});
    }
    /**
     * @param {keyof {fields: 1, editMode: 1}} storeName
     * @param {(fieldsOrEditMode: any) => any} fn
     */
    listen(storeName, fn) {
        const store = this[`${storeName}Store`];
        store.subscribe(() => {
            fn(store.getState());
        });
    }
}

FieldsStore.counter = 0;

FieldsStore.makeField = () => ({
    name: `newField${++FieldsStore.counter}`,
    friendlyName: 'Uusi kenttä',
    dataType: 'text',
    defaultValue: '',
    widget: {
        name: 'textField',
        args: {}
    },
    key: ++counter
});

export default FieldsStore;
