import {widgetTypes} from '../all.js';
const {createStore} = window.Redux;

let counter = 0;

class MultiFieldFieldsStore {
    /**
     * @param {Array<MultiFieldField>} initialFields
     */
    constructor(initialFields) {
        this.store = createStore((state, action) => {
            if (action.type === 'ADD_FIELD')
                return state.concat(MultiFieldFieldsStore.makeField(action.widgetType, state.length));
            if (action.type === 'REMOVE_FIELD')
                return state.filter(field => field.id !== action.fieldId);
            if (action.type === 'SET_PROPS') {
                return state.map(field => field.id === action.fieldId
                    ? Object.assign({}, field, action.props)
                    : field);
            }
            return state;
        }, initialFields);
        if (initialFields)
            counter = initialFields.reduce((max, f) => f.id > max ? f.id : max, 0);
        else
            this.addField(widgetTypes[0]);
    }
    /**
     * @returns {Array<MultiFieldField>}
     * @access public
     */
    getFields() {
        return this.store.getState();
    }
    /**
     * @param {string} fieldId
     * @param {Object} props
     * @access public
     */
    setFieldProps(fieldId, props) {
        this.store.dispatch({type: 'SET_PROPS', props, fieldId});
    }
    /**
     * @param {{name: string; friendlyName: string; description: string;}} widgetType
     * @access public
     */
    addField(widgetType) {
        this.store.dispatch({type: 'ADD_FIELD', widgetType});
    }
    /**
     * @param {string} fieldId
     * @access public
     */
    removeField(fieldId) {
        this.store.dispatch({type: 'REMOVE_FIELD', fieldId});
    }
    /**
     * @param {(fields: Array<MultiFieldField>) => any} fn
     * @access public
     */
    listen(fn) {
        this.store.subscribe(() => {
            fn(this.store.getState());
        });
    }
    /**
     * @param {{name: string; friendlyName: string; description: string;}} widgetType
     * @param {number=} numFields
     * @returns {MultiFieldField}
     * @access public
     */
    static makeField(widgetType, numFields) {
        return {id: (++counter).toString(),
                name: `field${(numFields || 0) + 1}`,
                widget: {name: widgetType.name, args: {}},
                value: ''};
    }
}

export default MultiFieldFieldsStore;
