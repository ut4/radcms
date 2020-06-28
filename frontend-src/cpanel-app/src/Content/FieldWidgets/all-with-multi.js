import {config} from '@rad-commons';
import MultiFieldFieldWidget from './MultiField/MultiField.jsx';
import getImplNoMulti, {widgetTypes as widgetTypesNoMulti} from './all.js';

/**
 * @param {'textField'|'textArea'|'richText'|'imagePicker'|'datePicker'|'dateTimePicker'|'colorPicker'|'contentSelector'|'hidden'|'multiField'} widgetName
 * @returns {{ImplClass: Object; props: Object;}}
 * @throws {Error}
 */
export default widgetName => {
    if (widgetName === 'multiField')
        return {ImplClass: MultiFieldFieldWidget,
                props: {showConfigureButton: config.userPermissions.canManageFieldsOfMultiFieldContent}};
    return getImplNoMulti(widgetName);
};

export const widgetTypes = widgetTypesNoMulti.concat(
    {name: 'multiField', friendlyName: 'Monikenttäsisältö', description: 'Monikenttäsisältö'},
);
