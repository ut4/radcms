import config from './config.js';
import http from './services/http.js';
import myFetch from './services/myFetch.js';
import FeatherSvg from './components/FeatherSvg.jsx';
import hookForm, {InputGroup, InputError, Input, Textarea, Select,
                  FormButtons, Validator} from './components/Form.jsx';
import toasters, {Toaster} from './components/Toaster.jsx';
import View from './components/View.jsx';
import Confirmation, {FormConfirmation} from './components/Confirmation.jsx';
import {dateUtils, urlUtils} from './utils.js';
const services = {sessionStorage: window.sessionStorage, console: window.console};

export {config, http, myFetch, services, toasters,
        hookForm, InputGroup, Input, Textarea, Select, InputError, FormButtons,
        Validator as FormInputValidator,
        Toaster, View, Confirmation, FormConfirmation, FeatherSvg,
        dateUtils, urlUtils};
