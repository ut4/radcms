import {config} from '@rad-commons';
import MultiFieldFieldWidget from './MultiField.jsx';
import getImplNoMulti from './all.js';

/**
 * @param {'textField'|'textArea'|'richText'|'imagePicker'|'datePicker'|'dateTimePicker'|'colorPicker'|'contentSelector'|'hidden'|'multiField'} type
 * @returns {Object}
 * @throws {Error}
 */
export default widgetName => {
    if (widgetName === 'multiField')
        return {ImplClass: MultiFieldFieldWidget,
                props: {showConfigureButton: config.userPermissions.canManageFieldsOfMultiFieldContent}};
    return getImplNoMulti(widgetName);
};
