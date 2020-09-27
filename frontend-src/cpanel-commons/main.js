import Register from './src/ContentPanelOrFormRegister.js';
import {DefaultImplForFetchOne, DefaultImplForFetchAll} from './src/content-panel-impls.jsx';
import {ValidatingFormImpl} from './src/content-form-impls.jsx';
import FieldsFilter from './src/FieldsFilter.js';
import ContentNodeUtils from './src/ContentNodeUtils.js';

const contentPanelRegister = new Register();
contentPanelRegister.registerImpl('DefaultSingle', DefaultImplForFetchOne);
contentPanelRegister.registerImpl('DefaultCollection', DefaultImplForFetchAll);

const contentFormRegister = new Register();
contentFormRegister.registerImpl('ValidatingForm', ValidatingFormImpl);
contentFormRegister.registerImpl('Default', ValidatingFormImpl);

export {contentPanelRegister, contentFormRegister, ContentNodeUtils, FieldsFilter};
