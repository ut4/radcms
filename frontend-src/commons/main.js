import config from './config.js';
import http from './services/http.js';
import myFetch from './services/myFetch.js';
import FeatherSvg from './components/FeatherSvg.jsx';
import Form, {InputGroup, InputError, Input, Textarea, Select} from './components/Form.jsx';
import hookForm, {FormButtons, InputGroup as InputGroup2, InputError as InputError2,
                  Input as Input2, Textarea as Textarea2, Select as Select2,
                  Validator} from './components/Form2.jsx';
import toasters, {Toaster} from './components/Toaster.jsx';
import View from './components/View.jsx';
import Confirmation, {FormConfirmation} from './components/Confirmation.jsx';
import {dateUtils, urlUtils} from './utils.js';
const services = {sessionStorage: window.sessionStorage};

export {config, http, myFetch, services, toasters,
        FeatherSvg, Form, InputGroup, Input, Textarea, Select, InputError,
        hookForm, FormButtons, InputGroup2, Input2, Textarea2, Select2, InputError2,
        Validator as FormInputValidator,
        Toaster, View, Confirmation, FormConfirmation,
        dateUtils, urlUtils};
