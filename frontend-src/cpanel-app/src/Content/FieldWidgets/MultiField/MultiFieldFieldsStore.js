import getWidgetImpl, {widgetTypes} from '../all.js';
const {createStore} = window.Redux;

class MultiFieldFieldsStore {
    /**
     * @param {MultiFieldsBundle} initialFields
     */
    constructor(initialFields) {
        this.store = createStore((state, action) => {
            if (action.type === 'ADD_FIELD') {
                const parts = MultiFieldFieldsStore.makeNewField(action.widgetType, state.__fields.length);
                return Object.assign({}, state, {
                    [parts.meta.name]: parts.value,
                    __fields: state.__fields.concat(parts.meta),
                });
            } if (action.type === 'REMOVE_FIELD') {
                return Object.assign(state.__fields.reduce((filtered, field) => {
                    if (field.name !== action.fieldName)
                        filtered[field.name] = state[field.name];
                    return filtered;
                }, {}), {
                    __fields: state.__fields.filter(field => field.name !== action.fieldName),
                });
            } if (action.type === 'SET_PROPS') {
                const copy = Object.assign({}, state);
                const __field = copy.__fields.find(f => f.name === action.fieldName);
                Object.keys(action.props).forEach(key => {
                    if (key !== 'value') { // name, widget
                        if (key === 'name')
                            delete copy[action.fieldName];
                        __field[key] = action.props[key];
                    } else
                        copy[action.props.name || __field.name] = action.props[key];
                });
                return copy;
            }
            if (action.type === 'REORDER')
                return Object.assign({}, state, {
                    __fields: action.orderedNames.map(fieldName => state.__fields.find(f => f.name === fieldName))
                });
            return state;
        }, initialFields);
        if (!initialFields)
            this.addField(widgetTypes[0]);
    }
    /**
     * @returns {MultiFieldsBundle}
     * @access public
     */
    getFields() {
        return this.store.getState();
    }
    /**
     * @param {string} fieldName
     * @param {Object} props
     * @access public
     */
    setFieldProps(fieldName, props) {
        this.store.dispatch({type: 'SET_PROPS', props, fieldName});
    }
    /**
     * @param {{name: string; friendlyName: string; description: string; group?: string;}} widgetType
     * @access public
     */
    addField(widgetType) {
        this.store.dispatch({type: 'ADD_FIELD', widgetType});
    }
    /**
     * @param {string} fieldName
     * @access public
     */
    removeField(fieldName) {
        this.store.dispatch({type: 'REMOVE_FIELD', fieldName});
    }
    /**
     * @param {Array<string>} orderedNames
     * @access public
     */
    reorder(orderedNames) {
        this.store.dispatch({type: 'REORDER', orderedNames});
    }
    /**
     * @param {(fieldsBundle: MultiFieldsBundle) => any} fn
     * @access public
     */
    listen(fn) {
        this.store.subscribe(() => {
            fn(this.store.getState());
        });
    }
    /**
     * @param {{name: string; friendlyName: string; description: string; group?: string;}} widgetType
     * @param {number=} numFields
     * @returns {{meta: MultiFieldMeta; value: string;}}
     * @access public
     */
    static makeNewField(widgetType, numFields) {
        return {
            meta: {
                name: `field${(numFields || 0) + 1}`,
                widget: {name: widgetType.name, args: {}} // @todo default args?
            },
            value: getWidgetImpl(widgetType.name).ImplClass.getInitialValue()
        };
    }
}

export default MultiFieldFieldsStore;
