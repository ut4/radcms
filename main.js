/**
 * # main.js
 *
 * This file is the main entry point of RadCMS.
 *
 */
const {app} = require('./src/app.js');
const {webApp} = require('./src/web.js');
require('./src/directives.js').init();
require('./src/file-watchers.js').init();
require('./src/core-handlers.js').init();
require('./src/file-handlers.js').init();
require('./src/website-handlers.js').init();

app.initAndInstall();
webApp.start();
