import config from './config.js';
import http from './services/http.js';
import myFetch from './services/myFetch.js';
import FeatherSvg from './components/FeatherSvg.jsx';
import toasters, {Toaster} from './components/Toaster.jsx';
import View from './components/View.jsx';
import Confirmation, {FormConfirmation} from './components/Confirmation.jsx';
const services = {sessionStorage: window.sessionStorage, console: window.console};

export * from './components/Form.jsx';
export {config, http, myFetch, services, toasters,
        Toaster, View, Confirmation, FormConfirmation, FeatherSvg};
export * from './utils.js';
