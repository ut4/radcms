import '../src/globals.js';
import {App} from './src/main-app.js';

preact.render($el(App, null, null), document.getElementById('app'));
