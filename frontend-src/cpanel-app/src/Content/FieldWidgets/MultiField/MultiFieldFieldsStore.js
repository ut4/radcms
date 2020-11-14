import getWidgetImpl, {widgetTypes} from '../all.js';
const {createStore} = window.Redux;

let counter = 0;

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
                    if (field.id !== action.fieldId)
                        filtered[field.name] = state[field.name];
                    return filtered;
                }, {}), {
                    __fields: state.__fields.filter(field => field.id !== action.fieldId),
                });
            } if (action.type === 'SET_PROPS') {
                const copy = Object.assign({}, state);
                Object.keys(action.props).forEach(key => {
                    const __field = copy.__fields.find(f => f.id === action.fieldId);
                    if (key !== 'value') { // name, widget
                        if (key === 'name')
                            delete copy[__field.name];
                        __field[key] = action.props[key];
                    } else
                        copy[__field.name] = action.props[key];
                });
                return copy;
            }
            if (action.type === 'REORDER')
                return Object.assign({}, state, {
                    __fields: action.orderedIds.map(fieldId => state.__fields.find(f => f.id === fieldId))
                });
            return state;
        }, initialFields);
        if (initialFields)
            counter = initialFields.__fields.reduce((max, f) => f.id > max ? f.id : max, 0);
        else
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
     * @param {string} fieldId
     * @param {Object} props
     * @access public
     */
    setFieldProps(fieldId, props) {
        this.store.dispatch({type: 'SET_PROPS', props, fieldId});
    }
    /**
     * @param {{name: string; friendlyName: string; description: string; group?: string;}} widgetType
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
     * @param {Array<string>} orderedIds
     * @access public
     */
    reorder(orderedIds) {
        this.store.dispatch({type: 'REORDER', orderedIds});
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
                id: (++counter).toString(),
                name: `field${(numFields || 0) + 1}`,
                widget: {name: widgetType.name, args: {}} // @todo default args?
            },
            value: getWidgetImpl(widgetType.name).ImplClass.getInitialValue()
        };
    }
}

export default MultiFieldFieldsStore;
