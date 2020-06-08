import Register from './src/ContentPanelOrFormRegister.js';
import {ContentPanelImpl, DefaultImplForFetchOne,
        DefaultImplForFetchAll} from './src/content-panel-impls.jsx';
import {ContentFormImpl, DefaultImpl} from './src/content-form-impls.jsx';
import FieldsFilter from './src/FieldsFilter.js';
import ContentNodeUtils from './src/ContentNodeUtils.js';

const contentPanelRegister = new Register();
contentPanelRegister.registerImpl('DefaultSingle', DefaultImplForFetchOne);
contentPanelRegister.registerImpl('DefaultCollection', DefaultImplForFetchAll);

const contentFormRegister = new Register();
contentFormRegister.registerImpl('Default', DefaultImpl);

export {contentPanelRegister, contentFormRegister,
        ContentPanelImpl, ContentFormImpl,
        ContentNodeUtils, FieldsFilter};
