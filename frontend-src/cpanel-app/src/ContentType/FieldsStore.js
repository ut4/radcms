const {createStore} = window.Redux;

class FieldsStore {
    /**
     * Wräppää redux-storen.
     */
    constructor(initialFields) {
        this.store = createStore((state, action) => {
            if (action.type === 'ADD_FIELD')
                return state.concat(FieldsStore.makeField());
            if (action.type === 'REMOVE_FIELD')
                return state.filter(field => field.name !== action.field.name);
            if (action.type === 'SET_PROPS')
                return state.map(field => field.name === action.field.name
                    ? Object.assign({}, field, action.props)
                    : field);
            return state;
        }, initialFields);
        if (!initialFields)
            this.addField();
    }
    /**
     * @returns {Array<ContentTypeField>}
     * @access public
     */
    getFields() {
        return this.store.getState();
    }
    /**
     * @param {ContentTypeField} field
     * @param {Object} props
     * @access public
     */
    setProps(field, props) {
        this.store.dispatch({type: 'SET_PROPS', props, field});
    }
    /**
     * @access public
     */
    addField() {
        this.store.dispatch({type: 'ADD_FIELD'});
    }
    /**
     * @param {ContentTypeField} field
     * @access public
     */
    removeField(field) {
        this.store.dispatch({type: 'REMOVE_FIELD', field});
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
    }
});

export default FieldsStore;
