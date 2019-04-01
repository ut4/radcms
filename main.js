/**
 * # main.js
 *
 * This file is the main entry point of RadCMS.
 *
 */
const {app} = require('./src/app.js');
const {webApp} = require('./src/web.js');
require('./src/core-handlers.js').init();
require('./src/website-handlers.js').init();

app.initAndInstall();
webApp.start();
